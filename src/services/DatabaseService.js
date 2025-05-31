import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lender } from '../models/Lender';
import { Borrower } from '../models/Borrower';
import { CalculatorService } from './CalculatorService';

export class DatabaseService {
  static LENDERS_KEY = '@p2p_lenders';
  static BORROWERS_KEY = '@p2p_borrowers';

  // Lender operations
  static async getAllLenders() {
    try {
      const lendersData = await AsyncStorage.getItem(this.LENDERS_KEY);
      if (lendersData) {
        const parsedData = JSON.parse(lendersData);
        return parsedData.map(data => new Lender(data));
      }
      return [];
    } catch (error) {
      console.error('Error fetching lenders:', error);
      return [];
    }
  }

  static async saveLender(lender) {
    try {
      const lenders = await this.getAllLenders();
      const existingIndex = lenders.findIndex(l => l._id === lender._id);
      
      if (existingIndex >= 0) {
        lenders[existingIndex] = lender;
      } else {
        lenders.push(lender);
      }
      
      await AsyncStorage.setItem(this.LENDERS_KEY, JSON.stringify(lenders.map(l => l.toJSON())));
      return true;
    } catch (error) {
      console.error('Error saving lender:', error);
      return false;
    }
  }

  static async deleteLender(lenderId) {
    try {
      const lenders = await this.getAllLenders();
      const filteredLenders = lenders.filter(l => l._id !== lenderId);
      await AsyncStorage.setItem(this.LENDERS_KEY, JSON.stringify(filteredLenders.map(l => l.toJSON())));
      return true;
    } catch (error) {
      console.error('Error deleting lender:', error);
      return false;
    }
  }

  // Borrower operations
  static async getAllBorrowers() {
    try {
      const borrowersData = await AsyncStorage.getItem(this.BORROWERS_KEY);
      if (borrowersData) {
        const parsedData = JSON.parse(borrowersData);
        return parsedData.map(data => new Borrower(data));
      }
      return [];
    } catch (error) {
      console.error('Error fetching borrowers:', error);
      return [];
    }
  }

  static async saveBorrower(borrower) {
    try {
      const borrowers = await this.getAllBorrowers();
      const existingIndex = borrowers.findIndex(b => b._id === borrower._id);
      
      if (existingIndex >= 0) {
        borrowers[existingIndex] = borrower;
      } else {
        borrowers.push(borrower);
      }
      
      await AsyncStorage.setItem(this.BORROWERS_KEY, JSON.stringify(borrowers.map(b => b.toJSON())));
      return true;
    } catch (error) {
      console.error('Error saving borrower:', error);
      return false;
    }
  }

  static async deleteBorrower(borrowerId) {
    try {
      const borrowers = await this.getAllBorrowers();
      const filteredBorrowers = borrowers.filter(b => b._id !== borrowerId);
      await AsyncStorage.setItem(this.BORROWERS_KEY, JSON.stringify(filteredBorrowers.map(b => b.toJSON())));
      return true;
    } catch (error) {
      console.error('Error deleting borrower:', error);
      return false;
    }
  }

  // Automatic loan creation with lender distribution
  static async createLoanWithAutoDistribution(borrower, amount, interestRatePerMonth, loanDate, notes = '', lenderDistribution) {
    try {
      const lenders = await this.getAllLenders();
      
      // Create loan in borrower
      const loanId = borrower.addLoan(amount, interestRatePerMonth, loanDate, notes, lenderDistribution);
      
      // Update lenders - allocate funds
      for (const distribution of lenderDistribution) {
        const lender = lenders.find(l => l._id === distribution.lender_id);
        if (lender) {
          lender.addLendingTransaction(distribution.amount_given, loanId, borrower.full_name);
          await this.saveLender(lender);
        }
      }
      
      // Save borrower
      await this.saveBorrower(borrower);
      
      return { success: true, loanId, distribution: lenderDistribution };
    } catch (error) {
      console.error('Error creating loan with auto distribution:', error);
      return { success: false, error: error.message };
    }
  }

  // Automatic repayment processing with interest distribution
  static async processRepaymentWithInterestDistribution(borrower, loanId, actualRepaymentAmount, repaymentDate, notes = '') {
    try {
      const loan = borrower.loan_history.find(l => l.loan_id === loanId);
      if (!loan) {
        throw new Error('Loan not found');
      }

      // Calculate months between loan date and repayment date
      const monthsActual = CalculatorService.calculateMonthsBetweenDates(loan.loan_date, repaymentDate);
      
      // Calculate repayment distribution
      const distributionDetails = CalculatorService.calculateRepaymentDistribution(
        actualRepaymentAmount, 
        loan, 
        monthsActual
      );
      
      // Add repayment to borrower
      borrower.addRepayment(loanId, actualRepaymentAmount, repaymentDate, notes);
      
      // Distribute to lenders
      const lenders = await this.getAllLenders();
      
      for (const distribution of distributionDetails.distribution) {
        const lender = lenders.find(l => l._id === distribution.lender_id);
        if (lender) {
          // Add interest earned
          if (distribution.interest_earned > 0) {
            lender.addAutomaticInterest(
              distribution.interest_earned, 
              loanId, 
              borrower.full_name
            );
          }
          
          // Return principal
          lender.addRepaymentReceived(
            distribution.principal_return, 
            loanId, 
            borrower.full_name
          );
          
          await this.saveLender(lender);
        }
      }
      
      // Save borrower
      await this.saveBorrower(borrower);
      
      return { 
        success: true, 
        distribution: distributionDetails.distribution,
        summary: distributionDetails
      };
    } catch (error) {
      console.error('Error processing repayment:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility methods
  static async clearAllData() {
    try {
      await AsyncStorage.multiRemove([this.LENDERS_KEY, this.BORROWERS_KEY]);
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  // Get portfolio summary
  static async getPortfolioSummary() {
    try {
      const [lenders, borrowers] = await Promise.all([
        this.getAllLenders(),
        this.getAllBorrowers()
      ]);

      const totalInvested = lenders.reduce((sum, lender) => sum + lender.total_invested, 0);
      const totalInterestEarned = lenders.reduce((sum, lender) => sum + lender.total_interest_earned, 0);
      const totalActiveLending = lenders.reduce((sum, lender) => sum + lender.total_lent, 0);
      const totalAvailableFunds = lenders.reduce((sum, lender) => sum + lender.getAvailableFunds(), 0);
      
      const totalLoansGiven = borrowers.reduce((sum, borrower) => sum + borrower.getTotalBorrowed(), 0);
      const totalRepaid = borrowers.reduce((sum, borrower) => sum + borrower.getTotalRepaid(), 0);
      const totalOutstanding = borrowers.reduce((sum, borrower) => sum + borrower.getOutstandingAmount(), 0);

      return {
        lenders: {
          count: lenders.length,
          total_invested: totalInvested,
          interest_earned: totalInterestEarned,
          active_lending: totalActiveLending,
          available_funds: totalAvailableFunds,
          portfolio_value: totalInvested + totalInterestEarned
        },
        borrowers: {
          count: borrowers.length,
          total_borrowed: totalLoansGiven,
          total_repaid: totalRepaid,
          outstanding: totalOutstanding
        },
        overall: {
          total_transactions: lenders.reduce((sum, l) => sum + l.transactions.length, 0) + 
                            borrowers.reduce((sum, b) => sum + b.loan_history.length, 0),
          active_loans: borrowers.reduce((sum, b) => 
            sum + b.loan_history.filter(l => l.repayment_status === 'pending').length, 0
          )
        }
      };
    } catch (error) {
      console.error('Error getting portfolio summary:', error);
      return null;
    }
  }
}
