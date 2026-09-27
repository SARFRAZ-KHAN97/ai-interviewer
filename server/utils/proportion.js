export const computeGroundedCount = (total, structure) => {
  const hasExperience = (structure?.experience?.length ?? 0) > 0
  const hasProjects = (structure?.projects?.length ?? 0) > 0

  if (!hasExperience && !hasProjects) return { total: 0, experience: 0, projects: 0 }

  const k = Math.min(Math.max(Math.round(total * 0.3), 1), Math.max(total - 1, 0))
  if (k === 0) return { total: 0, experience: 0, projects: 0 }

  if (hasExperience && hasProjects) {
    const experience = Math.ceil(k / 2)
    return { total: k, experience, projects: k - experience }
  }

  return hasExperience
    ? { total: k, experience: k, projects: 0 }
    : { total: k, experience: 0, projects: k }
}
