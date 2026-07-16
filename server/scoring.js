export const DEFAULT_WEIGHTS = Object.freeze({
  price: 0.4,
  reputation: 0.35,
  speed: 0.25,
});

export function scoreBids(bids, budget, weights = DEFAULT_WEIGHTS) {
  if (!Array.isArray(bids) || bids.length === 0) return [];

  const eligible = bids.filter((bid) => bid.price <= budget && bid.verified);
  if (eligible.length === 0) return [];

  const maxPrice = Math.max(...eligible.map((bid) => bid.price));
  const maxMinutes = Math.max(...eligible.map((bid) => bid.deliveryMinutes));

  return eligible
    .map((bid) => {
      const priceScore = maxPrice === 0 ? 100 : ((maxPrice - bid.price) / maxPrice) * 100;
      const speedScore = maxMinutes === 0 ? 100 : ((maxMinutes - bid.deliveryMinutes) / maxMinutes) * 100;
      const total =
        priceScore * weights.price +
        bid.reputation * weights.reputation +
        speedScore * weights.speed;

      return {
        ...bid,
        score: Number(total.toFixed(1)),
        breakdown: {
          price: Number(priceScore.toFixed(1)),
          reputation: bid.reputation,
          speed: Number(speedScore.toFixed(1)),
        },
      };
    })
    .sort((a, b) => b.score - a.score);
}
