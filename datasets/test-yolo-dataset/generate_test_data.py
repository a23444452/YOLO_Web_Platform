"""Generate test dataset for YOLO training"""
from PIL import Image, ImageDraw
import random

# Create classes.txt
with open('classes.txt', 'w') as f:
    f.write('cat\ndog\nbird\n')

# Generate 10 test images with annotations
for i in range(10):
    # Create a simple colored image
    img = Image.new('RGB', (640, 480), color=(
        random.randint(100, 200),
        random.randint(100, 200),
        random.randint(100, 200)
    ))

    draw = ImageDraw.Draw(img)

    # Draw some random rectangles to simulate objects
    annotations = []
    num_objects = random.randint(1, 3)

    for j in range(num_objects):
        # Random bounding box
        x1 = random.randint(50, 400)
        y1 = random.randint(50, 300)
        x2 = x1 + random.randint(50, 150)
        y2 = y1 + random.randint(50, 150)

        # Make sure within bounds
        x2 = min(x2, 639)
        y2 = min(y2, 479)

        # Draw rectangle
        draw.rectangle([x1, y1, x2, y2], outline='red', width=3)

        # Convert to YOLO format (class x_center y_center width height)
        class_id = random.randint(0, 2)
        x_center = ((x1 + x2) / 2) / 640
        y_center = ((y1 + y2) / 2) / 480
        width = (x2 - x1) / 640
        height = (y2 - y1) / 480

        annotations.append(f"{class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}")

    # Save image
    img.save(f'images/img_{i:03d}.jpg')

    # Save annotation
    with open(f'labels/img_{i:03d}.txt', 'w') as f:
        f.write('\n'.join(annotations))

print("✅ Generated 10 test images with annotations")
print("📁 Files created:")
print("   - classes.txt")
print("   - images/img_000.jpg ~ img_009.jpg")
print("   - labels/img_000.txt ~ img_009.txt")
