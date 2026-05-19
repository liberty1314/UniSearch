import React from "react";
import { ImageIcon } from "lucide-react";

interface ResourceDetailGalleryProps {
  title: string;
  images?: string[];
}

const ResourceDetailGallery: React.FC<ResourceDetailGalleryProps> = ({ title, images }) => {
  if (!images?.length) {
    return null;
  }

  const isSingleImage = images.length === 1;

  return (
    <section
      data-testid="resource-detail-gallery"
      className="resource-detail-gallery-strip rounded-[2rem] px-5 py-5 sm:px-6 sm:py-6"
    >
      <div className="mb-3.5 flex items-center gap-2.5">
        <div className="rounded-2xl border border-slate-200/55 bg-white/45 p-2 text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-slate-300">
          <ImageIcon className="h-4 w-4" />
        </div>
        <h2
          className="resource-detail-section-title"
          style={{ fontFamily: '"Baskerville", "Times New Roman", "Songti SC", "STSong", serif' }}
        >
          相关图片
        </h2>
      </div>
      <div
        data-testid="resource-detail-gallery-track"
        className={
          isSingleImage
            ? "mx-auto max-w-4xl"
            : "flex snap-x gap-3 overflow-x-auto pb-1 xl:grid xl:grid-cols-3 xl:overflow-visible xl:pb-0"
        }
      >
        {images.map((image, index) => (
          <figure
            key={`${image}-${index}`}
            data-testid={isSingleImage ? "resource-detail-gallery-single-frame" : undefined}
            className={
              isSingleImage
                ? "resource-detail-gallery-frame group overflow-hidden rounded-[1.65rem]"
                : "resource-detail-gallery-frame group min-w-[72vw] snap-start overflow-hidden rounded-[1.5rem] sm:min-w-[20rem] xl:min-w-0"
            }
          >
            <img
              src={image}
              alt={`${title} 相关图片 ${index + 1}`}
              className={
                isSingleImage
                  ? "h-52 w-full object-cover transition duration-500 group-hover:scale-[1.02] sm:h-64 xl:h-[22rem]"
                  : "h-44 w-full object-cover transition duration-500 group-hover:scale-[1.03] sm:h-48 xl:h-44 2xl:h-48"
              }
            />
          </figure>
        ))}
      </div>
    </section>
  );
};

export default ResourceDetailGallery;
