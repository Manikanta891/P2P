import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { CalculatorService } from '../services/CalculatorService';
import { globalStyles } from '../styles/globalStyles';

const TransactionHistoryScreen = ({ route, navigation }) => {
  const { data, title, type, borrower } = route.params;

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const LenderTransactionCard = ({ transaction, index }) => (
    <View style={[globalStyles.card, { marginBottom: 8 }]}>
      <View style={globalStyles.row}>
        <Text style={[globalStyles.subtitle, { 
          color: transaction.type === 'invest' ? '#2196F3' : 
                transaction.type === 'interest' ? '#4CAF50' :
                transaction.type === 'lend' ? '#FF9800' : '#9C27B0'
        }]}>
          {transaction.type === 'invest' ? 'Investment' : 
           transaction.type === 'interest' ? 'Interest Earned' :
           transaction.type === 'lend' ? 'Funds Lent' : 'Repayment Received'}
        </Text>
        <Text style={[globalStyles.amount, { 
          color: transaction.type === 'invest' ? '#2196F3' : 
                 transaction.type === 'interest' ? '#4CAF50' :
                 transaction.type === 'lend' ? '#FF9800' : '#9C27B0'
        }]}>
          {formatCurrency(transaction.amount)}
        </Text>
      </View>
      
      <View style={globalStyles.row}>
        <Text style={globalStyles.text}>Date:</Text>
        <Text style={globalStyles.text}>{formatDate(transaction.date)}</Text>
      </View>
      
      {transaction.auto_generated && (
        <View style={globalStyles.row}>
          <Text style={[globalStyles.text, { fontStyle: 'italic', color: '#666' }]}>
            Auto-generated
          </Text>
        </View>
      )}
      
      {transaction.loan_id && (
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Loan ID:</Text>
          <Text style={[globalStyles.text, { fontFamily: 'monospace' }]}>
            {transaction.loan_id.substring(0, 8)}...
          </Text>
        </View>
      )}
      
      {transaction.notes && (
        <View style={{ marginTop: 8 }}>
          <Text style={globalStyles.text}>Notes: {transaction.notes}</Text>
        </View>
      )}
    </View>
  );

  const BorrowerLoanCard = ({ loan, index }) => {
    const currentDate = new Date();
    const monthsSinceLoan = CalculatorService.calculateMonthsBetweenDates(loan.loan_date, currentDate);
    const currentExpectedInterest = CalculatorService.calculateMonthlyInterest(
      loan.amount, 
      loan.interest_rate_per_month, 
      monthsSinceLoan
    );
    const currentExpectedTotal = loan.amount + currentExpectedInterest;
    
    const totalRepaid = loan.repayments.reduce((sum, rep) => sum + rep.amount, 0);
    const outstanding = loan.repayment_status === 'pending' ? 
      Math.max(0, currentExpectedTotal - totalRepaid) : 0;

    return (
      <View style={[globalStyles.card, { marginBottom: 12 }]}>
        <View style={globalStyles.row}>
          <Text style={globalStyles.subtitle}>Loan #{index + 1}</Text>
          <Text style={[
            globalStyles.text,
            { 
              color: loan.repayment_status === 'completed' ? '#4CAF50' : '#F44336',
              fontWeight: '600'
            }
          ]}>
            {loan.repayment_status.toUpperCase()}
          </Text>
        </View>
        
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Principal:</Text>
          <Text style={[globalStyles.amount, { color: '#2196F3' }]}>
            {formatCurrency(loan.amount)}
          </Text>
        </View>
        
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Interest Rate:</Text>
          <Text style={globalStyles.text}>{loan.interest_rate_per_month}% per month</Text>
        </View>
        
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Loan Date:</Text>
          <Text style={globalStyles.text}>{formatDate(loan.loan_date)}</Text>
        </View>
        
        {loan.repayment_status === 'pending' && (
          <>
            <View style={globalStyles.row}>
              <Text style={globalStyles.text}>Duration (so far):</Text>
              <Text style={globalStyles.text}>{monthsSinceLoan.toFixed(2)} months</Text>
            </View>
            
            <View style={globalStyles.row}>
              <Text style={globalStyles.text}>Current Expected Total:</Text>
              <Text style={[globalStyles.amount, globalStyles.negativeAmount]}>
                {formatCurrency(currentExpectedTotal)}
              </Text>
            </View>
          </>
        )}
        
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Total Repaid:</Text>
          <Text style={[globalStyles.amount, globalStyles.positiveAmount]}>
            {formatCurrency(totalRepaid)}
          </Text>
        </View>
        
        {outstanding > 0 && (
          <View style={globalStyles.row}>
            <Text style={globalStyles.text}>Outstanding:</Text>
            <Text style={[globalStyles.amount, globalStyles.negativeAmount]}>
              {formatCurrency(outstanding)}
            </Text>
          </View>
        )}
        
        {loan.note && (
          <View style={{ marginTop: 8 }}>
            <Text style={globalStyles.text}>Note: {loan.note}</Text>
          </View>
        )}

        {/* Lenders Information */}
        {loan.lenders && loan.lenders.length > 0 && (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
            <Text style={[globalStyles.text, { fontWeight: '600', marginBottom: 8 }]}>
              Lenders ({loan.lenders.length}):
            </Text>
            {loan.lenders.map((lender, lenderIndex) => (
              <View key={lenderIndex} style={{ marginBottom: 4 }}>
                <View style={globalStyles.row}>
                  <Text style={globalStyles.text}>{lender.lender_name || `Lender ${lenderIndex + 1}`}:</Text>
                  <Text style={globalStyles.text}>{formatCurrency(lender.amount_given)}</Text>
                </View>
                <Text style={[globalStyles.text, { fontSize: 12, color: '#666' }]}>
                  {lender.percentage?.toFixed(1)}% of loan
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Repayments */}
        {loan.repayments && loan.repayments.length > 0 && (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
            <Text style={[globalStyles.text, { fontWeight: '600', marginBottom: 8 }]}>
              Repayments ({loan.repayments.length}):
            </Text>
            {loan.repayments.map((repayment, repIndex) => (
              <View key={repIndex} style={{ marginBottom: 12, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
                <View style={globalStyles.row}>
                  <Text style={globalStyles.text}>Payment {repIndex + 1}:</Text>
                  <Text style={[globalStyles.amount, globalStyles.positiveAmount]}>
                    {formatCurrency(repayment.amount)}
                  </Text>
                </View>
                
                <View style={globalStyles.row}>
                  <Text style={globalStyles.text}>Repayment Date:</Text>
                  <Text style={globalStyles.text}>{formatDate(repayment.repayment_date)}</Text>
                </View>
                
                {repayment.months_duration && (
                  <View style={globalStyles.row}>
                    <Text style={globalStyles.text}>Duration:</Text>
                    <Text style={globalStyles.text}>{repayment.months_duration.toFixed(2)} months</Text>
                  </View>
                )}
                
                {repayment.calculated_interest && (
                  <>
                    <View style={globalStyles.row}>
                      <Text style={globalStyles.text}>Expected Interest:</Text>
                      <Text style={globalStyles.text}>{formatCurrency(repayment.calculated_interest)}</Text>
                    </View>
                    
                    <View style={globalStyles.row}>
                      <Text style={globalStyles.text}>Expected Total:</Text>
                      <Text style={globalStyles.text}>{formatCurrency(repayment.expected_total)}</Text>
                    </View>
                    
                    {repayment.actual_vs_expected !== 0 && (
                      <View style={globalStyles.row}>
                        <Text style={globalStyles.text}>Difference:</Text>
                        <Text style={[
                          globalStyles.text,
                          { color: repayment.actual_vs_expected >= 0 ? '#4CAF50' : '#F44336' }
                        ]}>
                          {repayment.actual_vs_expected >= 0 ? '+' : ''}{formatCurrency(repayment.actual_vs_expected)}
                        </Text>
                      </View>
                    )}
                  </>
                )}
                
                {repayment.note && (
                  <Text style={[globalStyles.text, { fontSize: 14, fontStyle: 'italic', marginTop: 4 }]}>
                    Note: {repayment.note}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.row}>
        <Text style={globalStyles.title}>{title}</Text>
        <TouchableOpacity
          style={[globalStyles.button, { backgroundColor: '#666' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={globalStyles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {data.length === 0 ? (
          <View style={[globalStyles.card, { alignItems: 'center' }]}>
            <Text style={globalStyles.text}>
              No {type === 'lender' ? 'transactions' : 'loans'} found
            </Text>
          </View>
        ) : (
          <>
            {type === 'lender' ? (
              // Show lender transactions
              data.map((transaction, index) => (
                <LenderTransactionCard 
                  key={index} 
                  transaction={transaction} 
                  index={index} 
                />
              ))
            ) : (
              // Show borrower loans
              data.map((loan, index) => (
                <BorrowerLoanCard 
                  key={loan.loan_id} 
                  loan={loan} 
                  index={index} 
                />
              ))
            )}
          </>
        )}

        {/* Summary Card */}
        {data.length > 0 && (
          <View style={[globalStyles.card, { backgroundColor: '#f0f8ff' }]}>
            <Text style={[globalStyles.subtitle, { color: '#1976d2' }]}>Summary</Text>
            
            {type === 'lender' ? (
              <>
                <View style={globalStyles.row}>
                  <Text style={globalStyles.text}>Total Transactions:</Text>
                  <Text style={globalStyles.text}>{data.length}</Text>
                </View>
                <View style={globalStyles.row}>
                  <Text style={globalStyles.text}>Investments:</Text>
                  <Text style={[globalStyles.amount, { color: '#2196F3' }]}>
                    {formatCurrency(
                      data.filter(t => t.type === 'invest')
                          .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </Text>
                </View>
                <View style={globalStyles.row}>
                  <Text style={globalStyles.text}>Interest Earned:</Text>
                  <Text style={[globalStyles.amount, globalStyles.positiveAmount]}>
                    {formatCurrency(
                      data.filter(t => t.type === 'interest')
                          .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </Text>
                </View>
                <View style={globalStyles.row}>
                  <Text style={globalStyles.text}>Currently Lent:</Text>
                  <Text style={[globalStyles.amount, { color: '#FF9800' }]}>
                    {formatCurrency(
                      data.filter(t => t.type === 'lend')
                          .reduce((sum, t) => sum + t.amount, 0) -
                      data.filter(t => t.type === 'repayment_received')
                          .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={globalStyles.row}>
                  <Text style={globalStyles.text}>Total Loans:</Text>
                  <Text style={globalStyles.text}>{data.length}</Text>
                </View>
                <View style={globalStyles.row}>
                  <Text style={globalStyles.text}>Total Borrowed:</Text>
                  <Text style={[globalStyles.amount, globalStyles.negativeAmount]}>
                    {formatCurrency(borrower?.getTotalBorrowed() || 0)}
                  </Text>
                </View>
                <View style={globalStyles.row}>
                  <Text style={globalStyles.text}>Total Repaid:</Text>
                  <Text style={[globalStyles.amount, globalStyles.positiveAmount]}>
                    {formatCurrency(borrower?.getTotalRepaid() || 0)}
                  </Text>
                </View>
                <View style={globalStyles.row}>
                  <Text style={globalStyles.text}>Current Outstanding:</Text>
                  <Text style={[globalStyles.amount, globalStyles.negativeAmount]}>
                    {formatCurrency(borrower?.getOutstandingAmount() || 0)}
                  </Text>
                </View>
                <View style={globalStyles.row}>
                  <Text style={globalStyles.text}>Active Loans:</Text>
                  <Text style={globalStyles.text}>
                    {data.filter(loan => loan.repayment_status === 'pending').length}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default TransactionHistoryScreen;
