"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface Feature {
  id: string | number
  title: string
  description: string
  image: string
  icon?: React.ElementType
}

export interface FeatureStepsProps {
  features: Feature[]
  title?: string
  autoPlayInterval?: number
  imageHeight?: string
  className?: string
}

export function FeatureSteps({
  features,
  title,
  autoPlayInterval = 4000,
  className,
}: FeatureStepsProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const handleNext = useCallback(() => {
    setActiveStep((prev) => (prev + 1) % features.length)
  }, [features.length])

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(handleNext, autoPlayInterval)
    return () => clearInterval(interval)
  }, [isAutoPlaying, handleNext, autoPlayInterval])

  if (!features || features.length === 0) return null

  return (
    <div className={cn("w-full max-w-6xl mx-auto px-4 sm:px-6", className)}>
      {title && (
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-blue tracking-tight">
            {title}
          </h2>
        </div>
      )}

      <div className="flex flex-col items-center justify-center w-full">
        <div 
          className="space-y-4 sm:space-y-6 flex flex-col items-center justify-center"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
          role="tablist"
        >
          {features.map((feature, index) => {
            const isActive = index === activeStep
            const Icon = feature.icon

            return (
              <motion.button
                key={feature.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveStep(index)
                  setIsAutoPlaying(false)
                }}
                className={cn(
                  "w-full text-left p-6 rounded-2xl transition-all duration-300 border-2 max-w-[50%]",
                  isActive 
                    ? "bg-primary-blue/5 border-primary/20 shadow-sm" 
                    : "bg-transparent border-transparent hover:bg-muted/50"
                )}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center justify-center gap-4">
                  {Icon && (
                    <div className={cn(
                      "p-3 rounded-xl transition-colors duration-300",
                      isActive ? "bg-primary-blue text-primary-foreground" : "bg-muted/30 text-muted-foreground"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className={cn(
                      "text-xl font-semibold mb-2 transition-colors duration-300",
                      isActive ? "text-primary-blue" : "text-foreground"
                    )}>
                      {feature.title}
                    </h3>
                    <p className={cn(
                      "text-sm leading-relaxed transition-colors duration-300",
                      isActive ? "text-foreground/80" : "text-muted-foreground"
                    )}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>

      </div>
    </div>
  )
}
