from sqlmodel import SQLModel, create_engine, Session
from .models import ImageMeta
import os

DB_URL = "sqlite:///./test.db"
engine = create_engine(DB_URL, echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)

def seed_from_folder(images_folder: str):
    with Session(engine) as sess:
        for fn in sorted(os.listdir(images_folder)):
            if not fn.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                continue
            is_ai = fn.lower().startswith('ai_')
            img = ImageMeta(filename=fn, is_ai=is_ai)
            sess.add(img)
        sess.commit()

if __name__ == "__main__":
    init_db()
    images_folder = os.path.join(os.path.dirname(__file__), "static", "images")
    seed_from_folder(images_folder)
    print("DB initialized and seeded")

