export function calculateWhoCompliance(observations = []) {
  const opportunities = observations.length
  const professionals = new Set(
    observations
      .map((item) => String(item.professionalCode || '').trim().toLocaleUpperCase('el-GR'))
      .filter(Boolean),
  ).size
  const handRub = observations.filter((item) => item.action === 'HR').length
  const handWash = observations.filter((item) => item.action === 'HW').length
  const missed = observations.filter((item) => item.action === 'MISSED').length
  const correctActions = handRub + handWash
  const compliance = opportunities > 0
    ? Math.round((correctActions / opportunities) * 1000) / 10
    : 0

  return {
    opportunities,
    professionals,
    handRub,
    handWash,
    missed,
    correctActions,
    compliance,
  }
}

export function calculateEnvironmentStats(samples = []) {
  const total = samples.length
  const positive = samples.filter((item) => item.resultStatus === 'Θετικό').length
  const negative = samples.filter((item) => item.resultStatus === 'Αρνητικό').length
  const pending = samples.filter((item) => item.resultStatus === 'Εκκρεμεί').length
  const acceptable = samples.filter((item) => item.acceptable === 'Ναι').length
  const acceptableRate = total > 0
    ? Math.round((acceptable / total) * 1000) / 10
    : 0

  return {
    total,
    positive,
    negative,
    pending,
    acceptable,
    acceptableRate,
  }
}
