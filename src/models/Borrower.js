export class Borrower {
  constructor(data = {}) {
    this._id = data._id || this.generateId();
    this.full_name = data.full_name || '';
    this.loan_history = data.loan_history || [];
  }

  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  addLoan(amount, interestRatePerMonth, loanDate, note = '', lenders = []) {
    const loan = {
      loan_id: this.generateId(),
      amount,
      interest_rate_per_month: interestRatePerMonth,
      loan_date: loanDate,
      repayment_status: 'pending',
      note,
      lenders,
      repayments: []
    };
    
    this.loan_history.push(loan);
    return loan.loan_id;
  }

  addRepayment(loan_id, actualAmount, repaymentDate, note = '') {
    const loan = this.loan_history.find(l => l.loan_id === loan_id);
    if (loan) {
      // Calculate months between loan date and repayment date
      const loanDate = new Date(loan.loan_date);
      const repayDate = new Date(repaymentDate);
      const monthsDiff = this.calculateMonthsDifference(loanDate, repayDate);
      
      // Calculate expected interest
      const calculatedInterest = loan.amount * loan.interest_rate_per_month * monthsDiff / 100;
      const expectedTotal = loan.amount + calculatedInterest;
      
      const repayment = {
        amount: actualAmount,
        repayment_date: repaymentDate,
        months_duration: monthsDiff,
        calculated_interest: calculatedInterest,
        expected_total: expectedTotal,
        actual_vs_expected: actualAmount - expectedTotal,
        note
      };
      
      loan.repayments.push(repayment);
      
      // Mark as completed (since no partial payments)
      loan.repayment_status = 'completed';
      loan.actual_repayment_date = repaymentDate;
      loan.actual_months_duration = monthsDiff;
    }
    return loan;
  }

  calculateMonthsDifference(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    const dayDiff = end.getDate() - start.getDate();
    
    let totalMonths = yearDiff * 12 + monthDiff;
    
    // If end day is before start day, subtract a month and add fractional part
    if (dayDiff < 0) {
      totalMonths -= 1;
      const daysInPrevMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
      totalMonths += (daysInPrevMonth + dayDiff) / daysInPrevMonth;
    } else if (dayDiff > 0) {
      const daysInCurrentMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
      totalMonths += dayDiff / daysInCurrentMonth;
    }
    
    return Math.round(totalMonths * 100) / 100; // Round to 2 decimal places
  }

  getTotalBorrowed() {
    return this.loan_history.reduce((sum, loan) => sum + loan.amount, 0);
  }

  getTotalRepaid() {
    return this.loan_history.reduce((sum, loan) => 
      sum + loan.repayments.reduce((repSum, rep) => repSum + rep.amount, 0), 0
    );
  }

  getOutstandingAmount() {
    return this.loan_history.reduce((sum, loan) => {
      if (loan.repayment_status === 'pending') {
        // Calculate current expected amount based on current date
        const currentDate = new Date();
        const monthsSinceLoan = this.calculateMonthsDifference(new Date(loan.loan_date), currentDate);
        const currentExpectedInterest = loan.amount * loan.interest_rate_per_month * monthsSinceLoan / 100;
        const currentExpectedTotal = loan.amount + currentExpectedInterest;
        
        const totalRepaid = loan.repayments.reduce((repSum, rep) => repSum + rep.amount, 0);
        return sum + Math.max(0, currentExpectedTotal - totalRepaid);
      }
      return sum;
    }, 0);
  }

  toJSON() {
    return {
      _id: this._id,
      full_name: this.full_name,
      loan_history: this.loan_history
    };
  }
}
