export const getAnnouncementImages = (announcement) => {
  let images = announcement?.images;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [];
    }
  }

  const imageNames = Array.isArray(images) ? [...images] : [];
  if (announcement?.image) imageNames.unshift(announcement.image);
  return [...new Set(imageNames)].filter(
    (image) => typeof image === "string" && image.length > 0,
  );
};
