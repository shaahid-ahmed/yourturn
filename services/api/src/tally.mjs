/**
 * The tally: the one place every member's answers meet.
 *
 * It runs in memory, returns only the winner, and keeps nothing. Its output is
 * three fields so that no caller can accidentally serialise a count of refusals,
 * a member id or a score into a response — any of which would let the group work
 * out whose limit removed the expensive option.
 *
 * Honest limitation: this function SEES every per-member answer while it runs.
 * The guarantee is a boundary plus a retention rule, not cryptography. Repeated
 * rounds can still leak by inference. See docs/00-context/PRODUCT.md.
 */

/**
 * @typedef {{ candidateId: string, feasible: boolean, score: number }} Answer
 * @typedef {{ memberId: string, answers: Answer[] }} MemberAnswers
 */

/**
 * @param {{ hangoutId: string, candidates: { candidateId: string, estCostPerPersonCents: number, startsAt: string }[], memberAnswers: MemberAnswers[] }} input
 * @returns {{ hangoutId: string, outcome: 'winner' | 'no_plan', winnerCandidateId: string | null }}
 */
export function tally({ hangoutId, candidates, memberAnswers }) {
  if (memberAnswers.length < 3) {
    throw new RangeError(
      'a tally needs at least three members, or a refusal is attributable',
    );
  }
  const candidateIds = candidates.map((candidate) => candidate.candidateId);

  // A missing answer must never be treated as agreement.
  for (const member of memberAnswers) {
    const answered = new Set(
      member.answers.map((answer) => answer.candidateId),
    );
    if (candidateIds.some((id) => !answered.has(id))) {
      throw new RangeError(
        'every member must answer every candidate before a tally',
      );
    }
  }

  const feasible = candidateIds.filter((id) =>
    memberAnswers.every(
      (member) =>
        member.answers.find((a) => a.candidateId === id)?.feasible === true,
    ),
  );

  if (feasible.length === 0) {
    return { hangoutId, outcome: 'no_plan', winnerCandidateId: null };
  }

  const totals = new Map(
    feasible.map((id) => [
      id,
      memberAnswers.reduce(
        (sum, member) =>
          sum + (member.answers.find((a) => a.candidateId === id)?.score ?? 0),
        0,
      ),
    ]),
  );

  /** @param {string} id */
  const costOf = (id) =>
    candidates.find((c) => c.candidateId === id)?.estCostPerPersonCents ?? 0;
  /** @param {string} id */
  const startOf = (id) =>
    candidates.find((c) => c.candidateId === id)?.startsAt ?? '';

  const winner = [...feasible].sort((a, b) => {
    const byScore = (totals.get(b) ?? 0) - (totals.get(a) ?? 0);
    if (byScore !== 0) return byScore;
    const byCost = costOf(a) - costOf(b);
    if (byCost !== 0) return byCost;
    return startOf(a) < startOf(b) ? -1 : startOf(a) > startOf(b) ? 1 : 0;
  })[0];

  return { hangoutId, outcome: 'winner', winnerCandidateId: winner };
}
