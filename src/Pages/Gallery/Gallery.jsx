import { useEffect, useState } from "react";
import { LuImage } from "react-icons/lu";
import { supabase } from "../../utils/supabase";
import { isTimeoutError, withRequestTimeout } from "../../utils/request";
import "./gallery.css";

const GALLERY_BUCKET = "site-assets";
const GALLERY_FOLDER = "gallery";
const IMAGE_EXTENSIONS = new Set(["avif", "gif", "jpeg", "jpg", "png", "webp"]);

const isImageFile = (fileName = "") => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  return IMAGE_EXTENSIONS.has(extension);
};

function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    const fetchGalleryImages = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const { data, error } = await withRequestTimeout(supabase.storage
          .from(GALLERY_BUCKET)
          .list(GALLERY_FOLDER, {
            limit: 100,
            sortBy: {
              column: "created_at",
              order: "desc",
            },
          }));

        if (!isCurrent) return;

        if (error) throw error;

        const galleryImages = (data || [])
          .filter((file) => file.name && isImageFile(file.name))
          .map((file) => {
            const path = `${GALLERY_FOLDER}/${file.name}`;
            const { data: publicUrlData } = supabase.storage
              .from(GALLERY_BUCKET)
              .getPublicUrl(path);

            return {
              id: file.id || path,
              name: file.name,
              url: publicUrlData.publicUrl,
              updatedAt: file.updated_at || file.created_at,
            };
          });

        setImages(galleryImages);
      } catch (error) {
        if (!isCurrent) return;

        console.error("Gallery load error:", error);
        setErrorMessage(
          isTimeoutError(error)
            ? "The gallery is taking too long to load. Please refresh in a moment."
            : "We could not load the gallery right now."
        );
        setImages([]);
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    fetchGalleryImages();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <main className="gallery-page">
      <section className="gallery-hero">
        <small className="tag color-primary bold-700">Puchi Moments</small>
        <h1 className="bold-800 center">Gallery</h1>
        <p className="center">
          A little wall of handmade favorites, custom gifts, and finished chibi keepsakes.
        </p>
      </section>

      <section className="gallery-section" aria-label="Gallery images">
        {loading && (
          <div className="gallery-grid" aria-label="Loading gallery">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div className="gallery-skeleton" key={item} />
            ))}
          </div>
        )}

        {!loading && errorMessage && (
          <p className="gallery-status">{errorMessage}</p>
        )}

        {!loading && !errorMessage && images.length === 0 && (
          <div className="gallery-empty">
            <LuImage />
            <h2>No gallery images yet</h2>
            <p>Finished pieces will appear here once images are added.</p>
          </div>
        )}

        {!loading && !errorMessage && images.length > 0 && (
          <div className="gallery-grid">
            {images.map((image, index) => (
              <article className="gallery-card" key={image.id}>
                <img src={image.url} alt={`Puchi Puchi gallery item ${index + 1}`} loading="lazy" />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Gallery;
