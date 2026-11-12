/**
 * The payment gate.
 *
 * A verified mechanism is not an approved money flow. Every call that would move
 * money passes through here, and while the gate is shut it returns an explicit
 * refusal. There is deliberately no simulated-success path: a demo that fakes a
 * capture teaches the audience something false.
 *
 * The gate cannot be constructed open without a recorded human approval, so
 * forgetting to record one fails at startup rather than at the till.
 */

export class GateClosedError extends Error {
  /** @param {{ action: string, blockingQuestions: string[], humanApprovalRecorded: boolean }} detail */
  constructor(detail) {
    super(`the payment gate is closed; ${detail.action} is refused`);
    this.name = 'GateClosedError';
    this.detail = detail;
  }

  toPayload() {
    return {
      code: 'payment_gate_blocked',
      message: this.message,
      gate: {
        open: false,
        blockingQuestions: this.detail.blockingQuestions,
        humanApprovalRecorded: this.detail.humanApprovalRecorded,
      },
    };
  }
}

export class PaymentGate {
  /** @param {{ open?: boolean, blockingQuestions?: string[], humanApprovalRecorded?: boolean, approvalReference?: string }} input */
  constructor({
    open = false,
    blockingQuestions = ['Q-008'],
    humanApprovalRecorded = false,
    approvalReference,
  } = {}) {
    if (open && !humanApprovalRecorded) {
      throw new Error(
        'the payment gate cannot be open without a recorded human approval',
      );
    }
    if (open && !approvalReference) {
      throw new Error(
        'an open payment gate must cite where the human approval is recorded',
      );
    }
    this.#open = open;
    this.blockingQuestions = [...blockingQuestions];
    this.humanApprovalRecorded = humanApprovalRecorded;
    this.approvalReference = approvalReference ?? null;
  }

  /** @type {boolean} */
  #open;

  isOpen() {
    return this.#open;
  }

  /**
   * @param {string} action
   * @returns {true}
   */
  assertOpen(action) {
    if (!this.#open) {
      throw new GateClosedError({
        action,
        blockingQuestions: this.blockingQuestions,
        humanApprovalRecorded: this.humanApprovalRecorded,
      });
    }
    return true;
  }
}
