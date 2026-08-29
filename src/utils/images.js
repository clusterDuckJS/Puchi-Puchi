const WEBP_QUALITY = 0.9;

const getWebpName = (fileName = "image") => {
  const baseName = String(fileName).replace(/\.[^.]+$/, "") || "image";
  return `${baseName}.webp`;
};

const createCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const canvasToWebpBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) {
      resolve(blob);
      return;
    }

    reject(new Error("Your browser could not convert this image to WebP."));
  }, "image/webp", WEBP_QUALITY);
});

const loadImage = (file) => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error("We could not read that image. Please choose a JPG, PNG, WEBP, GIF, or AVIF image."));
  };
  image.src = objectUrl;
});

/** Converts a browser-readable image file to WebP without uploading the original. */
export const convertImageToWebp = async (file) => {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Choose an image file to upload.");
  }

  let canvas;

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      canvas = createCanvas(bitmap.width, bitmap.height);
      canvas.getContext("2d").drawImage(bitmap, 0, 0);
      bitmap.close?.();
    } catch {
      // Some browser-supported formats cannot be decoded by createImageBitmap.
    }
  }

  if (!canvas) {
    const image = await loadImage(file);
    canvas = createCanvas(image.naturalWidth || image.width, image.naturalHeight || image.height);
    canvas.getContext("2d").drawImage(image, 0, 0);
  }

  const blob = await canvasToWebpBlob(canvas);
  return new File([blob], getWebpName(file.name), {
    type: "image/webp",
    lastModified: Date.now(),
  });
};
