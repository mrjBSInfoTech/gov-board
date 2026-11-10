import path from "path";

export const getAnnouncementImages = (images, legacyImage = null) => {
  let parsed = images;
  if (typeof images === "string") {
    try {
      parsed = JSON.parse(images);
    } catch {
      parsed = [];
    }
  }

  const imageNames = Array.isArray(parsed) ? parsed : [];
  if (legacyImage) imageNames.unshift(legacyImage);

  return [...new Set(imageNames)].filter(
    (image) =>
      typeof image === "string" &&
      image.length > 0 &&
      path.basename(image) === image &&
      !image.includes("\\"),
  );
};
