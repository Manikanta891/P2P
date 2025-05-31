export class Lender {
  constructor(data = {}) {
    this._id = data._id || this.generateId();
    this.full_name = data.full_name || '';
    this.total_invested = data.total_invested || 0;
    this.total_interest_earned = data.total_interest_earned || 0;
    this.total_lent = data.total_lent || 0; // Amount currently lent out
    this.created_at = data.created_at || new Date().toISOString();
    this.transactions = data.transactions || [];
  }

  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  addTransaction(type, amount, notes = '') {
    const transaction = {
      type,
      amount,
      date: new Date().toISOString(),
      notes
    };
    
    this.transactions.push(transaction);
    
    if (type === 'invest') {
      this.total_invested += amount;
    } else if (type === 'interest') {
      this.total_interest_earned += amount;
    } else if (type === 'lend') {
      this.total_lent += amount;
    } else if (type === 'repayment_received') {
      this.total_lent -= amount;
    }
  }

  // Add automatic interest (called by system when borrower repays)
  addAutomaticInterest(amount, loanId, borrowerName) {
    const transaction = {
      type: 'interest',
      amount,
      date: new Date().toISOString(),
      notes: `Auto-generated interest from ${borrowerName} (Loan: ${loanId})`,
      loan_id: loanId,
      auto_generated: true
    };
    
    this.transactions.push(transaction);
    this.total_interest_earned += amount;
  }

  // Add lending transaction (when funds are allocated to a loan)
  addLendingTransaction(amount, loanId, borrowerName) {
    const transaction = {
      type: 'lend',
      amount,
      date: new Date().toISOString(),
      notes: `Lent to ${borrowerName} (Loan: ${loanId})`,
      loan_id: loanId,
      auto_generated: true
    };
    
    this.transactions.push(transaction);
    this.total_lent += amount;
  }

  // Add repayment received transaction
  addRepaymentReceived(amount, loanId, borrowerName) {
    const transaction = {
      type: 'repayment_received',
      amount,
      date: new Date().toISOString(),
      notes: `Principal repayment from ${borrowerName} (Loan: ${loanId})`,
      loan_id: loanId,
      auto_generated: true
    };
    
    this.transactions.push(transaction);
    this.total_lent -= amount;
  }

  // FIXED: Available funds now includes interest earned
  getAvailableFunds() {
    // Total funds = invested amount + interest earned
    const totalFunds = this.total_invested + this.total_interest_earned;
    // Available = total funds - currently lent amount
    return totalFunds - this.total_lent;
  }

  // Total portfolio value (invested + interest earned)
  getTotalEarnings() {
    return this.total_invested + this.total_interest_earned;
  }

  // Same as getTotalEarnings for consistency
  getTotalPortfolioValue() {
    return this.total_invested + this.total_interest_earned;
  }

  // Amount currently lent out
  getActiveLendingAmount() {
    return this.total_lent;
  }

  // Get total funds available for lending (invested + interest)
  getTotalLendableFunds() {
    return this.total_invested + this.total_interest_earned;
  }

  // Get utilization rate (how much of total funds is currently lent)
  getUtilizationRate() {
    const totalFunds = this.getTotalLendableFunds();
    if (totalFunds === 0) return 0;
    return (this.total_lent / totalFunds * 100).toFixed(2);
  }

  toJSON() {
    return {
      _id: this._id,
      full_name: this.full_name,
      total_invested: this.total_invested,
      total_interest_earned: this.total_interest_earned,
      total_lent: this.total_lent,
      created_at: this.created_at,
      transactions: this.transactions
    };
  }
}
