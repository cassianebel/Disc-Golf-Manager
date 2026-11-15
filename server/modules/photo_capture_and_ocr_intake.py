from __future__ import annotations


class PhotoCaptureAndOcrIntake:
    def capture_photo(self, image_path: str) -> str:
        raise NotImplementedError(
            "PhotoCaptureAndOcrIntake.capture_photo is not implemented."
        )

    def infer_brand_and_name(self, image_path: str) -> dict[str, str]:
        raise NotImplementedError(
            "PhotoCaptureAndOcrIntake.infer_brand_and_name is not implemented."
        )
