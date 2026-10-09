import React from 'react';

const Stepper = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center w-full mb-6 sm:mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm border-2 transition-all duration-300 shadow-sm ${
                  isCompleted
                    ? 'bg-[#1E5CA8] border-[#1E5CA8] text-white'
                    : isActive
                    ? 'bg-[#1E5CA8] border-[#2563EB] text-white ring-4 ring-[#2563EB]/20'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className={`mt-2 text-xs sm:text-sm font-bold tracking-tight text-center ${isActive ? 'text-[#1E5CA8] font-extrabold' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-1 flex-grow mb-5 sm:mb-6 mx-1 sm:mx-2 rounded-full transition-all duration-300 ${index < currentStep ? 'bg-[#1E5CA8]' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;
