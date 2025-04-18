# classify_server.py
from flask import Flask, request, jsonify
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import torch
import os

app = Flask(__name__)

# Load model ONCE
print("🔁 Loading model...")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
model.eval()
device = torch.device("cpu")
model = model.to(device)

# Label list
LABELS = [
    "Hoan Kiem Lake", "One Pillar Pagoda", "Temple of Literature", "Long Bien Bridge",
    "Imperial Citadel of Thang Long", "Ha Long Bay", "Bai Dinh Pagoda", "Trang An",
    "Tam Coc", "Fansipan", "Imperial City of Hue", "Thien Mu Pagoda", "Dragon Bridge",
    "My Son Sanctuary", "Hoi An Ancient Town", "Japanese Bridge",
    "Phong Nha Ke Bang", "Dong Hoi Citadel", "Dai Noi Citadel", "Independence Palace",
    "Notre-Dame Cathedral of Saigon", "Bitexco Tower", "Ben Thanh Market",
    "Turtle Lake", "Cu Chi Tunnels", "Ba Den Mountain", "Cao Dai Temple",
    "Can Tho Bridge", "Tram Chim National Park", "Ba Chua Xu Temple",
]

@app.route("/classify", methods=["POST"])
def classify():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image = Image.open(request.files['image']).convert("RGB")

    with torch.no_grad():
        inputs = processor(text=LABELS, images=image, return_tensors="pt", padding=True).to(device)
        outputs = model(**inputs)
        probs = outputs.logits_per_image.softmax(dim=1).squeeze()
        best_idx = probs.argmax().item()

    label = LABELS[best_idx]
    confidence = round(probs[best_idx].item() * 100, 2)

    return jsonify({"landmark": label, "confidence": confidence})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3030)
