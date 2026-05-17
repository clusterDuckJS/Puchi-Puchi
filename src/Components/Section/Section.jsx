import React from 'react'
import './section.css'

const Section = ({
  id,
  sectionClass = "",
  tag,
  title,
  description,
  children,
}) => {
  return (
    <section id={id} className={`${sectionClass} flex-col align-center`}>
      
      {tag && (
        <small className='tag color-primary bold-600 center'>
          {tag}
        </small>
      )}

      {title && <h2 className='bold-800 center'>{title}</h2>}

      {description && <p className='center'>{description}</p>}

      <div className="children">
        {children}
      </div>

    </section>
  );
};

export default Section
