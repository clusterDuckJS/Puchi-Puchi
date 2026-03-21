import React from 'react'
import './section.css'

const Section = ({
  sectionClass = "",
  tag,
  title,
  description,
  children,
}) => {
  return (
    <section className={sectionClass}>
      
      {tag && (
        <small className='tag color-primary bold-600'>
          {tag}
        </small>
      )}

      {title && <h2 className='bold-800'>{title}</h2>}

      {description && <p>{description}</p>}

      <div className="children">
        {children}
      </div>

    </section>
  );
};

export default Section