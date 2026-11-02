import React from 'react'

const PageHeader = ({title, subtitle, children}) => {
  return (
    <div className=''>
        <div className='flex items-start justify-between mb-6'>
            <h1 className='text-2xl font-medium text-slate-900 tracking-tight mb-2'  >
                {title}
            </h1>
            {subtitle && (
                <p className='text-slate-500 text-sm'>
                    {subtitle}
                </p>
            )}
            {children && <div>{children}</div>}
        </div>
    </div>
  )
}

export default PageHeader