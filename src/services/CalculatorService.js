export class CalculatorService {
  
  // Calculate interest based on months and monthly rate
  static calculateMonthlyInterest(principal, monthlyRate, months) {
    return (principal * monthlyRate * months) / 100;
  }

  // Calculate compound interest monthly
  static calculateCompoundInterestMonthly(principal, monthlyRate, months) {
    const amount = principal * Math.pow((1 + monthlyRate / 100), months);
    return amount - principal;
  }

  // Calculate EMI for loan (monthly)
  static calculateEMI(principal, monthlyRate, tenureMonths) {
    const rate = monthlyRate / 100;
    const emi = (principal * rate * Math.pow(1 + rate, tenureMonths)) / 
                (Math.pow(1 + rate, tenureMonths) - 1);
    return Math.round(emi * 100) / 100;
  }

  // Calculate total repayment based on months
  static calculateTotalRepaymentMonthly(principal, monthlyRate, months) {
    const interest = this.calculateMonthlyInterest(principal, monthlyRate, months);
    return principal + interest;
  }

  // Calculate months between two dates
  static calculateMonthsBetweenDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    const dayDiff = end.getDate() - start.getDate();
    
    let totalMonths = yearDiff * 12 + monthDiff;
    
    if (dayDiff < 0) {
      totalMonths -= 1;
      const daysInPrevMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
      totalMonths += (daysInPrevMonth + dayDiff) / daysInPrevMonth;
    } else if (dayDiff > 0) {
      const daysInCurrentMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
      totalMonths += dayDiff / daysInCurrentMonth;
    }
    
    return Math.round(totalMonths * 100) / 100;
  }

  // Distribute loan amount among lenders based on available funds
  static distributeLoanAmongLenders(totalAmount, availableLenders) {
    const lendersWithFunds = availableLenders.filter(lender => lender.getAvailableFunds() > 0);
    
    if (lendersWithFunds.length === 0) {
      throw new Error('No lenders with available funds');
    }

    const totalAvailableFunds = lendersWithFunds.reduce((sum, lender) => sum + lender.getAvailableFunds(), 0);
    
    if (totalAvailableFunds < totalAmount) {
      throw new Error(`Insufficient funds. Available: ₹${totalAvailableFunds.toLocaleString()}, Required: ₹${totalAmount.toLocaleString()}`);
    }

    // Distribute proportionally based on available funds
    const distribution = [];
    let remainingAmount = totalAmount;

    lendersWithFunds.forEach((lender, index) => {
      let allocation;
      
      if (index === lendersWithFunds.length - 1) {
        allocation = remainingAmount;
      } else {
        const proportion = lender.getAvailableFunds() / totalAvailableFunds;
        allocation = Math.min(
          Math.round(totalAmount * proportion), 
          lender.getAvailableFunds(), 
          remainingAmount
        );
      }

      if (allocation > 0) {
        distribution.push({
          lender_id: lender._id,
          lender_name: lender.full_name,
          amount_given: allocation,
          available_funds: lender.getAvailableFunds(),
          percentage: (allocation / totalAmount) * 100
        });
        remainingAmount -= allocation;
      }
    });

    return distribution;
  }

  // Calculate repayment distribution to lenders
  static calculateRepaymentDistribution(actualRepaymentAmount, loan, monthsActual) {
    const totalLentAmount = loan.lenders.reduce((sum, lender) => sum + lender.amount_given, 0);
    
    // Calculate expected interest
    const expectedInterest = this.calculateMonthlyInterest(
      loan.amount, 
      loan.interest_rate_per_month, 
      monthsActual
    );
    const expectedTotal = loan.amount + expectedInterest;
    
    // Calculate actual interest earned (could be different from expected)
    const actualInterest = Math.max(0, actualRepaymentAmount - loan.amount);
    
    const distribution = loan.lenders.map(lender => {
      const lenderProportion = lender.amount_given / totalLentAmount;
      
      // Principal return
      const principalReturn = lender.amount_given;
      
      // Interest distribution based on proportion
      const interestShare = actualInterest * lenderProportion;
      
      // Expected vs actual for this lender
      const expectedInterestForLender = expectedInterest * lenderProportion;
      
      return {
        lender_id: lender.lender_id,
        lender_name: lender.lender_name,
        original_contribution: lender.amount_given,
        principal_return: principalReturn,
        interest_earned: interestShare,
        total_return: principalReturn + interestShare,
        expected_interest: expectedInterestForLender,
        interest_difference: interestShare - expectedInterestForLender,
        percentage_share: lenderProportion * 100
      };
    });

    return {
      loan_amount: loan.amount,
      expected_interest: expectedInterest,
      expected_total: expectedTotal,
      actual_repayment: actualRepaymentAmount,
      actual_interest: actualInterest,
      months_duration: monthsActual,
      monthly_rate: loan.interest_rate_per_month,
      distribution
    };
  }

  // Calculate current outstanding for a pending loan
  static calculateCurrentOutstanding(loan, currentDate = new Date()) {
    const monthsSinceLoan = this.calculateMonthsBetweenDates(loan.loan_date, currentDate);
    const currentExpectedInterest = this.calculateMonthlyInterest(
      loan.amount, 
      loan.interest_rate_per_month, 
      monthsSinceLoan
    );
    return loan.amount + currentExpectedInterest;
  }

  // Calculate return on investment for lenders (monthly basis)
  static calculateROI(invested, earned, months) {
    if (invested === 0 || months === 0) return 0;
    const monthlyROI = (earned / invested) * 100;
    return monthlyROI.toFixed(2);
  }

  // Calculate annualized ROI from monthly
  static calculateAnnualizedROI(monthlyROI) {
    return (monthlyROI * 12).toFixed(2);
  }

  // Loan maturity calculation with monthly interest
  static calculateLoanMaturityMonthly(principal, monthlyRate, startDate, durationInMonths) {
    const start = new Date(startDate);
    const maturityDate = new Date(start);
    maturityDate.setMonth(maturityDate.getMonth() + durationInMonths);
    
    const interest = this.calculateMonthlyInterest(principal, monthlyRate, durationInMonths);
    const totalAmount = principal + interest;

    return {
      principal,
      monthly_rate: monthlyRate,
      duration_months: durationInMonths,
      interest,
      totalAmount,
      startDate: start.toISOString(),
      maturityDate: maturityDate.toISOString(),
      monthly_interest: interest / durationInMonths
    };
  }
}
