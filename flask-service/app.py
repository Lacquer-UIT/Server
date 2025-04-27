from flask import Flask, request, jsonify
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import torch
import os

app = Flask(__name__)

# Load model ONCE
print("🔁 Loading model...")
processor = CLIPProcessor.from_pretrained("wkcn/TinyCLIP-ViT-61M-32-Text-29M-LAION400M")
model = CLIPModel.from_pretrained("wkcn/TinyCLIP-ViT-61M-32-Text-29M-LAION400M")
model.eval()
device = torch.device("cpu")
model = model.to(device)

# Full labels and their simplified versions (dictionary for faster lookup)
LABELS = [
    "a photo of Hoan Kiem Lake in Hanoi",
    "the One Pillar Pagoda in Hanoi, Vietnam",
    "the Temple of Literature, an ancient university in Hanoi",
    "Long Bien Bridge, a historic steel bridge in Hanoi",
    "Imperial Citadel of Thang Long, an ancient site in Hanoi",
    "a scenic view of Ha Long Bay with limestone karsts",
    "a boat ride through Trang An landscape complex",
    "Tam Coc river surrounded by rice fields and karst mountains",
    "a mountaintop view from Fansipan, the highest mountain in Vietnam",
    "the Imperial City of Hue, a historical royal complex",
    "Thien Mu Pagoda overlooking the Perfume River in Hue",
    "Dragon Bridge in Da Nang lit up at night",
    "My Son Sanctuary, ancient Hindu temple ruins in Vietnam",
    "Hoi An Ancient Town with lantern-lit streets",
    "Phong Nha Ke Bang caves and karst mountains",
    "Dong Hoi Citadel, a historic Vietnamese fortress",
    "Dai Noi Citadel, the main gate of the Imperial City",
    "Independence Palace, a landmark in Ho Chi Minh City",
    "Notre-Dame Cathedral of Saigon, a French colonial church",
    "Bitexco Tower, a modern skyscraper in Saigon",
    "Ben Thanh Market, a bustling market in Saigon",
    "Turtle Lake roundabout in Ho Chi Minh City",
    "Cao Dai Temple, a colorful religious site in Tay Ninh",
    "Can Tho Bridge over the Mekong River",
    "Tram Chim National Park with wetlands and birds",
    "Ba Chua Xu Temple, a pilgrimage site in Chau Doc",

    "a bowl of Pho, Vietnamese noodle soup with herbs",
    "a Banh Mi sandwich with pickled vegetables and pork",
    "Bun Cha, grilled pork with noodles and dipping sauce",
    "Com Tam, broken rice with grilled pork and egg",
    "Banh Xeo, Vietnamese crispy pancakes with shrimp",
    "Goi Cuon, fresh Vietnamese spring rolls",
    "Cha Gio, crispy Vietnamese fried spring rolls",
    "Hu Tieu, Southern Vietnamese noodle soup",
    "Mi Quang, turmeric noodles from Central Vietnam",
    "Che Ba Mau, three-color Vietnamese dessert",
    "Ca Phe Sua Da, iced Vietnamese coffee with milk",
    "Banh Cuon, steamed rice rolls with minced pork",
    "Banh Trang Tron, Vietnamese rice paper salad",
    "Nem Nuong, grilled pork sausage with rice paper",
    "Bun Bo Hue, spicy beef noodle soup from Hue",

    "a Non La, traditional Vietnamese conical hat",
    "a person wearing an Ao Dai, Vietnamese long dress",
    "a motorbike on a Vietnamese street",
    "a red Lì Xì envelope used during Lunar New Year",
    "the national flag of the Socialist Republic of Vietnam, red with a yellow star",
    "a traditional Vietnamese lacquer painting, also known as sơn mài",
    "a plastic stool commonly seen on Vietnamese sidewalks (ghế nhựa)",
    "a vintage Vietnamese thermos, also known as bình thủy",
    "a Đông Hồ painting, a traditional Vietnamese folk artwork",
    "a street food cart selling hu tieu noodles (xe hủ tiếu gõ), often seen at night",
    "none of the above"
]

# Simplified labels dictionary (for fast lookup)
SIMPLIFIED_LABELS = {
    "a photo of Hoan Kiem Lake in Hanoi": "Hoan Kiem Lake",
    "the One Pillar Pagoda in Hanoi, Vietnam": "One Pillar Pagoda",
    "the Temple of Literature, an ancient university in Hanoi": "Temple of Literature",
    "Long Bien Bridge, a historic steel bridge in Hanoi": "Long Bien Bridge",
    "Imperial Citadel of Thang Long, an ancient site in Hanoi": "Imperial Citadel of Thang Long",
    "a scenic view of Ha Long Bay with limestone karsts": "Ha Long Bay",
    "a boat ride through Trang An landscape complex": "Trang An",
    "Tam Coc river surrounded by rice fields and karst mountains": "Tam Coc",
    "a mountaintop view from Fansipan, the highest mountain in Vietnam": "Fansipan",
    "the Imperial City of Hue, a historical royal complex": "Imperial City of Hue",
    "Thien Mu Pagoda overlooking the Perfume River in Hue": "Thien Mu Pagoda",
    "Dragon Bridge in Da Nang lit up at night": "Dragon Bridge",
    "My Son Sanctuary, ancient Hindu temple ruins in Vietnam": "My Son Sanctuary",
    "Hoi An Ancient Town with lantern-lit streets": "Hoi An Ancient Town",
    "Phong Nha Ke Bang caves and karst mountains": "Phong Nha Ke Bang",
    "Dong Hoi Citadel, a historic Vietnamese fortress": "Dong Hoi Citadel",
    "Dai Noi Citadel, the main gate of the Imperial City": "Dai Noi Citadel",
    "Independence Palace, a landmark in Ho Chi Minh City": "Independence Palace",
    "Notre-Dame Cathedral of Saigon, a French colonial church": "Notre-Dame Cathedral",
    "Bitexco Tower, a modern skyscraper in Saigon": "Bitexco Tower",
    "Ben Thanh Market, a bustling market in Saigon": "Ben Thanh Market",
    "Turtle Lake roundabout in Ho Chi Minh City": "Turtle Lake",
    "Cao Dai Temple, a colorful religious site in Tay Ninh": "Cao Dai Temple",
    "Can Tho Bridge over the Mekong River": "Can Tho Bridge",
    "Tram Chim National Park with wetlands and birds": "Tram Chim National Park",
    "Ba Chua Xu Temple, a pilgrimage site in Chau Doc": "Ba Chua Xu Temple",

    "a bowl of Pho, Vietnamese noodle soup with herbs": "Pho",
    "a Banh Mi sandwich with pickled vegetables and pork": "Banh Mi",
    "Bun Cha, grilled pork with noodles and dipping sauce": "Bun Cha",
    "Com Tam, broken rice with grilled pork and egg": "Com Tam",
    "Banh Xeo, Vietnamese crispy pancakes with shrimp": "Banh Xeo",
    "Goi Cuon, fresh Vietnamese spring rolls": "Goi Cuon",
    "Cha Gio, crispy Vietnamese fried spring rolls": "Cha Gio",
    "Hu Tieu, Southern Vietnamese noodle soup": "Hu Tieu",
    "Mi Quang, turmeric noodles from Central Vietnam": "Mi Quang",
    "Che Ba Mau, three-color Vietnamese dessert": "Che Ba Mau",
    "Ca Phe Sua Da, iced Vietnamese coffee with milk": "Ca Phe Sua Da",
    "Banh Cuon, steamed rice rolls with minced pork": "Banh Cuon",
    "Banh Trang Tron, Vietnamese rice paper salad": "Banh Trang Tron",
    "Nem Nuong, grilled pork sausage with rice paper": "Nem Nuong",
    "Bun Bo Hue, spicy beef noodle soup from Hue": "Bun Bo Hue",

    "a Non La, traditional Vietnamese conical hat": "Non La",
    "a person wearing an Ao Dai, Vietnamese long dress": "Ao Dai",
    "a motorbike on a Vietnamese street": "Parked Motorbike",
    "a red Lì Xì envelope used during Lunar New Year": "Lì Xì Envelope",
    "the national flag of the Socialist Republic of Vietnam, red with a yellow star": "Vietnam Flag",
    "a traditional Vietnamese lacquer painting, also known as sơn mài": "Lacquer Painting",
    "a plastic stool commonly seen on Vietnamese sidewalks (ghế nhựa)": "Plastic Stool",
    "a vintage Vietnamese thermos, also known as bình thủy": "Bình Thủy",
    "a Đông Hồ painting, a traditional Vietnamese folk artwork": "Đông Hồ Painting",
    "a street food cart selling hu tieu noodles (xe hủ tiếu gõ), often seen at night": "Hu Tieu Cart",
    "none of the above": "None of the above"
}

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
    simplified_label = SIMPLIFIED_LABELS.get(label, label)  # Use the dictionary to map to the concise label
    confidence = round(probs[best_idx].item() * 100, 2)

    return jsonify({"landmark": simplified_label, "confidence": confidence})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3030)