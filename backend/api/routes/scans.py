from fastapi import APIRouter, Depends, HTTPException
from api.dependencies.auth import get_current_user
from api.services.scans import analyze_feed_post

router = APIRouter()

@router.post("/analyze")
async def analyze_feed_image(
    feed_post_id: str,
    user = Depends(get_current_user)
):

    try:

        result = analyze_feed_post(
            feed_post_id=feed_post_id
        )

        return result

    except ValueError as e:

        raise HTTPException(
            status_code=404,
            detail=str(e)
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )
