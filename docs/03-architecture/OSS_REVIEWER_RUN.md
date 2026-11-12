# Independent reviewer attempt on local open weights (RV-003)

**What was tried:** an independent review of the Lane S money and contract documents by a model with no authorship of them and no knowledge of this project, run entirely on local open weights so it cost nothing and sent no project data to a third party.

**Verdict: the attempt failed as a review and succeeded as a measurement.** Two real findings came out of roughly thirty model outputs, and both needed a human to separate them from the noise around them. **The independent-review gate is still open.**

## Setup

|            |                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| Runtime    | Ollama 0.40.16, installed locally; no account, no API key, no data leaving the machine                                   |
| Models     | `qwen3:8b` (5.2 GB) then `qwen3:14b` (9.3 GB), both Apache 2.0 open weights                                              |
| Hardware   | Apple M4, 16 GB unified memory, 100% GPU offload, 16k context                                                            |
| Throughput | ~21 tok/s on 8B; 14B took 635 s for one pass                                                                             |
| Harness    | `/Users/shaah/.hermes/cache/scratch/oss-reviewer.py` — three self-contained passes, raw replies written to disk unedited |
| Raw output | `oss-review-8b/` (3 passes) and `oss-review/` (1 pass, 14B) under the scratch directory                                  |

Each pass saw only the material for its own question, so nothing depended on this project's history. The passes asked: (1) do the payments documents violate the money rules or overstate their evidence, (2) does the API contract actually contain the seven fixes the author claims, (3) is there any path by which money moves without human approval and verified evidence.

## What went wrong

**Both models degenerated into repetition.** The 8B produced one finding restated ten times; the 14B produced three findings restated six times, despite an explicit instruction not to repeat and a `repeat_penalty` of 1.2.

**Both inverted the central money concept.** Each objected that a payout "settled on readback" was therefore unverified — when an authenticated readback of provider state is precisely the verification the rules require. The 14B did this _after_ being told in its system prompt that a readback counts as verified evidence.

**Severity labels were decorative.** The 8B marked seven items "Major" and then wrote "No finding" in the body of five of them.

**Pass 3 never answered its question.** Asked whether any path lets money move without approval, it quoted six safeguards in turn and said each was "not sufficient to block unauthorized money flows" without describing a single path.

A model that cannot hold "readback = verified" for one page cannot be trusted to judge whether a money flow is safe, and a reviewer whose findings must each be re-derived by hand has not reduced the work.

## What it nonetheless found

Both findings are real, both were verified against the repository before being accepted, and both are the same class of defect the human review round found: **a promise written in prose where a constraint was needed.**

**OSS-01 (major) — the derived pot and the real PayPal balance can disagree, and nothing said what happens then.** The 14B noticed that the documents call the collector account's balance the real spendable money while also deriving a pot from the ledger, without reconciling the two. `PAYMENTS.md` did acknowledge that a payout can fail for insufficient funds while the derived pot looks sufficient, but it never stated the governing rule. Now fixed: the derived pot is an **upper bound, never a promise the money is there**; the provider balance is authoritative for execution; reconciliation is **read-only**; and no compensating or plug entry may ever be written to make the two agree, because the ledger changes only on a verified provider event.

**OSS-02 (major) — the graph gate's strongest claim is one no contract test can reach.** The 8B objected that the extract shows a `graph_gate_blocked` error but nothing proving graph values never reach a prompt. That is correct, and it is a limit of the artifact rather than a flaw in the gate: a contract test can prove no graph-derived field crosses the API boundary, but prompt construction is in-process and invisible to the spec. So "no tie- or drift-derived input reaches the prompt" is enforced by a flag and a promise. Now recorded as a required **service-level test** in YT-019/YT-020 that asserts the exact assembled prompt against a fixture, with the claim treated as unverified until that test exists.

## What this says about the gate

The gate exists because nobody should approve their own work. Running a weak model does not satisfy it — it produces text shaped like a review that a human must then do the review on. Honest options, best first:

1. **A fresh session on a frontier model with no authorship of these documents**, given the repository and the rules and asked for the same three passes. Cost is real but small at this size.
2. **Alan's agent reviewing Lane S, and a different agent reviewing Lane A** — already half done, and it found 41 issues between the two directions.
3. **A larger local model** — a 30B-class MoE or a 70B at 4-bit would plausibly clear the bar, but 16 GB of unified memory will not hold one alongside a 16k context. This is a hardware limit, not a licensing one.

What a small local model _is_ good for, on this evidence: mechanical, single-fact checks with a narrow question and a short input — "does this file contain X", "do these two numbers match" — where a wrong answer is obvious. Not judgment about money.

## Cost

Zero in money. About 40 minutes of wall clock, 9.3 GB of disk, and more human verification time than the findings saved. Recorded so nobody repeats it expecting a different result on the same hardware.
