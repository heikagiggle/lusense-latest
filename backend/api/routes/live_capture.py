import io

from fastapi import (APIRouter, Depends, HTTPException, UploadFile, File)
from PIL import Image, UnidentifiedImageError
from api.dependencies.auth import get_current_user
from api.services.live_capture import (analyze_live_capture)

router = APIRouter()

# LIVE CAPTURE ANALYSIS

@router.post("")
async def analyze_live_capture_image(
    file: UploadFile = File(...),
    user = Depends(get_current_user)
):

    # 1. VALIDATE FILE TYPE

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp"
    }

    if file.content_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail=(
                "Only JPEG, PNG, and WebP "
                "images are allowed."
            )
        )

    try:

        # 2. READ IMAGE

        max_bytes = 10 * 1024 * 1024

        contents = await file.read(max_bytes + 1)

        if len(contents) > max_bytes:

            raise HTTPException(
                status_code=413,
                detail="Maximum image size is 10 MB."
            )

        if not contents:

            raise HTTPException(
                status_code=400,
                detail="Uploaded image is empty."
            )


        # 3. OPEN IMAGE


        try:

            image = Image.open(
                io.BytesIO(contents)
            )

            if image.width * image.height > 20_000_000:

                raise HTTPException(
                    status_code=413,
                    detail="Image dimensions are too large."
                )

            # Make sure the image data is actually loaded
            image.load()

        except UnidentifiedImageError:

            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid image."
            )

        # 4. RUN ANALYSIS

        result = analyze_live_capture(
            image
        )

        # 5. RETURN RESULT

        return result

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Live capture analysis failed: {str(e)}"
            )
        )
