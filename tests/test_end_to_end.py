"""End-to-end test for YOLO training API"""
import asyncio
import base64
import json
import zipfile
from io import BytesIO
from pathlib import Path
import time

import httpx
import websockets

API_BASE = "http://localhost:8000"
WS_BASE = "ws://localhost:8000"

async def create_dataset_zip():
    """Create a test dataset ZIP file"""
    print("📦 Creating dataset ZIP...")

    dataset_dir = Path.home() / "test-yolo-dataset"

    # Create ZIP in memory
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Add classes.txt
        zf.write(dataset_dir / "classes.txt", "classes.txt")

        # Add images (split into train/val)
        images = list((dataset_dir / "images").glob("*.jpg"))
        train_images = images[:8]  # 80% train
        val_images = images[8:]    # 20% val

        for img in train_images:
            zf.write(img, f"images/train/{img.name}")
            label = dataset_dir / "labels" / img.with_suffix('.txt').name
            if label.exists():
                zf.write(label, f"labels/train/{label.name}")

        for img in val_images:
            zf.write(img, f"images/val/{img.name}")
            label = dataset_dir / "labels" / img.with_suffix('.txt').name
            if label.exists():
                zf.write(label, f"labels/val/{label.name}")

    # Convert to base64
    zip_buffer.seek(0)
    zip_b64 = base64.b64encode(zip_buffer.read()).decode()

    print(f"✅ Dataset ZIP created ({len(zip_b64)} bytes base64)")
    return zip_b64


async def start_training(dataset_zip_b64):
    """Start a training job"""
    print("\n🚀 Starting training job...")

    config = {
        "name": "test-training",
        "yolo_version": "v8",
        "model_size": "n",  # nano model (fastest)
        "dataset_id": "test-dataset",
        "epochs": 3,  # Only 3 epochs for testing
        "batch_size": 4,
        "image_size": 640,
        "device": "cpu",  # CPU for compatibility
        "workers": 2,
        "optimizer": "Adam",
        "learning_rate": 0.01,
        "momentum": 0.937,
        "weight_decay": 0.0005,
        "patience": 50,
        "augmentation": {
            "mosaic": True,
            "mixup": False,
            "rotation": 0.0,
            "hsv_h": 0.015,
            "hsv_s": 0.7,
            "hsv_v": 0.4,
            "translate": 0.1,
            "scale": 0.5,
            "flip_horizontal": True,
            "flip_vertical": False,
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{API_BASE}/api/training/start",
            json={
                "config": config,
                "dataset_zip": dataset_zip_b64
            }
        )

        if response.status_code != 200:
            print(f"❌ Failed to start training: {response.text}")
            return None

        result = response.json()
        job_id = result['job_id']
        print(f"✅ Training started: job_id = {job_id}")
        return job_id


async def monitor_training(job_id):
    """Monitor training via WebSocket"""
    print(f"\n👀 Monitoring training job {job_id}...")

    uri = f"{WS_BASE}/ws/training/{job_id}"

    try:
        async with websockets.connect(uri) as ws:
            print("✅ WebSocket connected")

            while True:
                try:
                    message = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    data = json.loads(message)

                    if data['type'] == 'status':
                        status = data['data'].get('status', 'unknown')
                        progress = data['data'].get('progress', 0)
                        print(f"📊 Status: {status} ({progress:.1f}%)")

                        if status in ['completed', 'failed', 'stopped']:
                            print(f"🏁 Training {status}")
                            break

                    elif data['type'] == 'log':
                        print(f"📝 Log: {data['data']}")

                    elif data['type'] == 'metrics':
                        metrics_data = data['data']
                        epoch = metrics_data.get('epoch', 0)
                        total_epochs = metrics_data.get('total_epochs', 0)
                        metrics = metrics_data.get('metrics', {})

                        print(f"\n📈 Epoch {epoch}/{total_epochs}:")
                        print(f"   - train_loss: {metrics.get('train_loss', 0):.4f}")
                        print(f"   - val_loss: {metrics.get('val_loss', 0):.4f}")
                        print(f"   - mAP50: {metrics.get('map50', 0):.4f}")
                        print(f"   - precision: {metrics.get('precision', 0):.4f}")
                        print(f"   - recall: {metrics.get('recall', 0):.4f}")

                    elif data['type'] == 'error':
                        error = data['data'].get('error', 'Unknown error')
                        print(f"❌ Error: {error}")
                        break

                except asyncio.TimeoutError:
                    # Send ping to keep connection alive
                    await ws.send("ping")
                    continue

    except Exception as e:
        print(f"❌ WebSocket error: {e}")


async def check_results(job_id):
    """Check training results"""
    print(f"\n🔍 Checking results for job {job_id}...")

    async with httpx.AsyncClient() as client:
        # Get training status
        response = await client.get(f"{API_BASE}/api/training/status/{job_id}")
        if response.status_code == 200:
            status = response.json()
            print(f"✅ Status: {status['status']}")
            print(f"   Progress: {status['progress']:.1f}%")
            print(f"   Epochs: {status['current_epoch']}/{status['total_epochs']}")
            print(f"   Metrics count: {len(status.get('metrics', []))}")
        else:
            print(f"❌ Failed to get status")

        # Get training results
        response = await client.get(f"{API_BASE}/api/training/{job_id}/results")
        if response.status_code == 200:
            results = response.json()
            print(f"\n📊 Results available:")
            files = results.get('files', {})
            for file_type, exists in files.items():
                status_icon = "✅" if exists else "❌"
                print(f"   {status_icon} {file_type}")
        else:
            print(f"❌ Failed to get results")


async def download_model(job_id):
    """Test model download"""
    print(f"\n⬇️  Testing model download for job {job_id}...")

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_BASE}/api/training/{job_id}/download")

        if response.status_code == 200:
            # Save model file
            model_path = Path.home() / f"yolo_{job_id}_best.pt"
            model_path.write_bytes(response.content)
            size_mb = len(response.content) / (1024 * 1024)
            print(f"✅ Model downloaded: {model_path} ({size_mb:.2f} MB)")
        else:
            print(f"❌ Failed to download model: {response.text}")


async def main():
    """Run end-to-end test"""
    print("=" * 60)
    print("🧪 YOLO End-to-End Test")
    print("=" * 60)

    try:
        # Step 1: Create dataset
        dataset_zip = await create_dataset_zip()

        # Step 2: Start training
        job_id = await start_training(dataset_zip)
        if not job_id:
            return

        # Step 3: Monitor training
        await monitor_training(job_id)

        # Step 4: Check results
        await check_results(job_id)

        # Step 5: Download model
        await download_model(job_id)

        print("\n" + "=" * 60)
        print("✅ End-to-end test completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
