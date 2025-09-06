import React from 'react';

interface PyramidLoaderProps {
  size?: number; // pixel size of the square container
  className?: string;
}

/**
 * 3D pyramid rotating loader. Pure CSS (tailwind-compatible) using classes defined in index.css
 */
const PyramidLoader: React.FC<PyramidLoaderProps> = ({ size = 160, className }) => {
  const style: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
  };

  return (
    <div className={className}>
      <div className="pyramid-loader" style={style}>
        <div className="pyramid-wrapper">
          <span className="pyramid-side side1" />
          <span className="pyramid-side side2" />
          <span className="pyramid-side side3" />
          <span className="pyramid-side side4" />
          <span className="pyramid-shadow" />
        </div>
      </div>
    </div>
  );
};

export default PyramidLoader;


