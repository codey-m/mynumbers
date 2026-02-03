from sqlmodel import SQLModel, Field
from typing import Optional

class ImageMeta(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str
    is_ai: bool  # ground truth

class Answer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    image_id: int
    guess_is_ai: bool
    correct: bool
    response_ms: Optional[int] = None

