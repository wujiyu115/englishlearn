# backend/app/routers/scenes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from ..database import get_db
from ..models import User, Scene, UserFavoriteScene
from ..schemas import SceneOut
from ..auth import get_current_user
from ..services.claude import generate_scene_dialogues

router = APIRouter()

def _scene_out(scene: Scene, user_id: int | None, db: Session) -> SceneOut:
    is_fav = False
    if user_id:
        is_fav = db.query(UserFavoriteScene).filter_by(user_id=user_id, scene_id=scene.id).first() is not None
    return SceneOut.model_validate(scene).model_copy(update={"is_favorited": is_fav})

@router.get("/presets", response_model=list[SceneOut])
def list_presets(db: Session = Depends(get_db)):
    scenes = db.query(Scene).filter(Scene.is_preset == True).all()
    return [_scene_out(s, None, db) for s in scenes]

@router.get("/search", response_model=SceneOut)
def search_scene(q: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Try preset match
    scene = db.query(Scene).filter(
        (Scene.name_cn.ilike(f"%{q}%")) | (Scene.name_en.ilike(f"%{q}%")),
        Scene.is_preset == True,
    ).first()
    if scene:
        return _scene_out(scene, current_user.id, db)
    # Try user's cached scene
    scene = db.query(Scene).filter(
        Scene.user_id == current_user.id,
        (Scene.name_cn.ilike(f"%{q}%")) | (Scene.name_en.ilike(f"%{q}%")),
    ).first()
    if scene:
        return _scene_out(scene, current_user.id, db)
    # Generate via Claude
    dialogues = generate_scene_dialogues(q)
    scene = Scene(
        user_id=current_user.id,
        name_cn=q,
        name_en=q,
        is_preset=False,
        dialogues=dialogues,
    )
    db.add(scene)
    db.commit()
    db.refresh(scene)
    return _scene_out(scene, current_user.id, db)

@router.post("/{scene_id}/favorite")
def favorite_scene(scene_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scene = db.get(Scene, scene_id)
    if not scene:
        raise HTTPException(404, "Scene not found")
    existing = db.query(UserFavoriteScene).filter_by(user_id=current_user.id, scene_id=scene_id).first()
    if not existing:
        try:
            db.add(UserFavoriteScene(user_id=current_user.id, scene_id=scene_id))
            db.commit()
        except IntegrityError:
            db.rollback()
    return {"ok": True}
