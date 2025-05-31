import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DatabaseService } from '../services/DatabaseService';
import { Borrower } from '../models/Borrower';
import { CalculatorService } from '../services/CalculatorService';
import { globalStyles } from '../styles/globalStyles';
import DatePickerInput from '../components/DatePickerInput';
import ManualLenderDistribution from '../components/ManualLenderDistribution';

const BorrowerScreen = ({ navigation }) => {
  const [borrowers, setBorrowers] = useState([]);
  const [lenders, setLenders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [repaymentModalVisible, setRepaymentModalVisible] = useState(false);
  const [lenderDistributionModalVisible, setLenderDistributionModalVisible] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [lenderDistribution, setLenderDistribution] = useState([]);
  const [distributionTotal, setDistributionTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form states
  const [borrowerName, setBorrowerName] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRatePerMonth, setInterestRatePerMonth] = useState('');
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [loanNotes, setLoanNotes] = useState('');
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [repaymentNotes, setRepaymentNotes] = useState('');
  const [repaymentPreview, setRepaymentPreview] = useState(null);

  const loadData = async () => {
    try {
      const [loadedBorrowers, loadedLenders] = await Promise.all([
        DatabaseService.getAllBorrowers(),
        DatabaseService.getAllLenders()
      ]);
      setBorrowers(loadedBorrowers);
      setLenders(loadedLenders);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Update repayment preview when date or loan changes - Fixed dependencies
  const updateRepaymentPreview = useCallback(() => {
    if (!selectedLoan || !repaymentDate) {
      setRepaymentPreview(null);
      return;
    }

    const months = CalculatorService.calculateMonthsBetweenDates(
      selectedLoan.loan_date, 
      repaymentDate
    );
    const interest = CalculatorService.calculateMonthlyInterest(
      selectedLoan.amount, 
      selectedLoan.interest_rate_per_month, 
      months
    );
    const expectedTotal = selectedLoan.amount + interest;

    setRepaymentPreview({
      months: months.toFixed(2),
      interest,
      expectedTotal,
      principal: selectedLoan.amount
    });
  }, [selectedLoan, repaymentDate]); // Fixed dependencies

  useEffect(() => {
    updateRepaymentPreview();
  }, [updateRepaymentPreview]);

  const handleAddBorrower = async () => {
    if (!borrowerName.trim()) {
      Alert.alert('Error', 'Please enter borrower name');
      return;
    }

    try {
      const newBorrower = new Borrower({ full_name: borrowerName.trim() });
      await DatabaseService.saveBorrower(newBorrower);
      setBorrowerName('');
      setModalVisible(false);
      loadData();
      Alert.alert('Success', 'Borrower added successfully');
    } catch (error) {
      console.error('Error adding borrower:', error);
      Alert.alert('Error', 'Failed to add borrower');
    }
  };

  const handleLoanPreview = () => {
    if (!loanAmount || isNaN(parseFloat(loanAmount))) {
      Alert.alert('Error', 'Please enter valid loan amount');
      return;
    }
    if (!interestRatePerMonth || isNaN(parseFloat(interestRatePerMonth))) {
      Alert.alert('Error', 'Please enter valid monthly interest rate');
      return;
    }

    const amount = parseFloat(loanAmount);
    const availableFunds = lenders.reduce((sum, lender) => sum + lender.getAvailableFunds(), 0);
    
    if (amount > availableFunds) {
      Alert.alert(
        'Insufficient Funds',
        `Total available funds: ₹${availableFunds.toLocaleString()}\nRequested: ₹${amount.toLocaleString()}`
      );
      return;
    }

    setLenderDistribution([]);
    setDistributionTotal(0);
    setLenderDistributionModalVisible(true);
  };

  // Fixed callback to prevent infinite loops
  const handleDistributionChange = useCallback((distribution, total) => {
    setLenderDistribution(distribution);
    setDistributionTotal(total);
  }, []);

  const handleConfirmLoan = async () => {
    const amount = parseFloat(loanAmount);
    
    if (Math.abs(distributionTotal - amount) > 0.01) {
      Alert.alert('Error', 'Distribution total must equal loan amount');
      return;
    }

    if (lenderDistribution.length === 0) {
      Alert.alert('Error', 'Please allocate funds from at least one lender');
      return;
    }

    try {
      const rate = parseFloat(interestRatePerMonth);
      
      // Create loan with manual distribution
      const result = await DatabaseService.createLoanWithAutoDistribution(
        selectedBorrower, 
        amount, 
        rate, 
        loanDate,
        loanNotes, 
        lenderDistribution
      );

      if (result.success) {
        setLoanAmount('');
        setInterestRatePerMonth('');
        setLoanNotes('');
        setLoanDate(new Date().toISOString().split('T')[0]);
        setLoanModalVisible(false);
        setLenderDistributionModalVisible(false);
        setSelectedBorrower(null);
        setLenderDistribution([]);
        setDistributionTotal(0);
        loadData();
        Alert.alert('Success', 'Loan created successfully with manual lender distribution');
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error creating loan:', error);
      Alert.alert('Error', 'Failed to create loan');
    }
  };

  const handleAddRepayment = async () => {
    if (!repaymentAmount || isNaN(parseFloat(repaymentAmount))) {
      Alert.alert('Error', 'Please enter valid repayment amount');
      return;
    }

    try {
      const amount = parseFloat(repaymentAmount);
      
      // Process repayment with automatic distribution
      const result = await DatabaseService.processRepaymentWithInterestDistribution(
        selectedBorrower,
        selectedLoan.loan_id,
        amount,
        repaymentDate,
        repaymentNotes
      );

      if (result.success) {
        setRepaymentAmount('');
        setRepaymentNotes('');
        setRepaymentDate(new Date().toISOString().split('T')[0]);
        setRepaymentModalVisible(false);
        setSelectedBorrower(null);
        setSelectedLoan(null);
        setRepaymentPreview(null);
        loadData();
        
        // Show distribution summary
        Alert.alert(
          'Repayment Processed', 
          `Amount distributed to ${result.distribution.length} lenders automatically`,
          [
            { text: 'OK' },
            { 
              text: 'View Details', 
              onPress: () => showRepaymentDetails(result.distribution)
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error processing repayment:', error);
      Alert.alert('Error', 'Failed to process repayment');
    }
  };

  const showRepaymentDetails = (distribution) => {
    const details = distribution.map(d => 
      `${d.lender_name}: ₹${d.total_return.toLocaleString()} (Principal: ₹${d.principal_return.toLocaleString()}, Interest: ₹${d.interest_earned.toLocaleString()})`
    ).join('\n');
    
    Alert.alert('Distribution Details', details);
  };

  const calculateExpectedRepayment = (loan) => {
    if (!loan) return { amount: 0, interest: 0, months: 0 };
    
    const currentDate = new Date();
    const months = CalculatorService.calculateMonthsBetweenDates(loan.loan_date, currentDate);
    const interest = CalculatorService.calculateMonthlyInterest(loan.amount, loan.interest_rate_per_month, months);
    
    return {
      amount: loan.amount + interest,
      interest,
      months: months.toFixed(2)
    };
  };

  const handleDeleteBorrower = (borrower) => {
    Alert.alert(
      'Delete Borrower',
      `Are you sure you want to delete ${borrower.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteBorrower(borrower._id);
              loadData();
              Alert.alert('Success', 'Borrower deleted successfully');
            } catch (error) {
              console.error('Error deleting borrower:', error);
              Alert.alert('Error', 'Failed to delete borrower');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const BorrowerCard = ({ borrower }) => (
    <View style={globalStyles.card}>
      <View style={globalStyles.row}>
        <Text style={globalStyles.subtitle}>{borrower.full_name}</Text>
        <TouchableOpacity
          onPress={() => handleDeleteBorrower(borrower)}
          style={{ padding: 4 }}
        >
          <Text style={{ color: '#F44336', fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <View style={globalStyles.row}>
        <Text style={globalStyles.text}>Total Borrowed:</Text>
        <Text style={[globalStyles.amount, globalStyles.negativeAmount]}>
          {formatCurrency(borrower.getTotalBorrowed())}
        </Text>
      </View>
      
      <View style={globalStyles.row}>
        <Text style={globalStyles.text}>Total Repaid:</Text>
        <Text style={[globalStyles.amount, globalStyles.positiveAmount]}>
          {formatCurrency(borrower.getTotalRepaid())}
        </Text>
      </View>
      
      <View style={globalStyles.row}>
        <Text style={globalStyles.text}>Current Outstanding:</Text>
        <Text style={[globalStyles.amount, globalStyles.negativeAmount]}>
          {formatCurrency(borrower.getOutstandingAmount())}
        </Text>
      </View>
      
      <View style={globalStyles.row}>
        <Text style={globalStyles.text}>Active Loans:</Text>
        <Text style={globalStyles.text}>
          {borrower.loan_history.filter(loan => loan.repayment_status === 'pending').length}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        <TouchableOpacity
          style={[globalStyles.button, { flex: 1, marginRight: 4 }]}
          onPress={() => {
            setSelectedBorrower(borrower);
            setLoanModalVisible(true);
          }}
        >
          <Text style={globalStyles.buttonText}>Add Loan</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[globalStyles.button, { flex: 1, marginHorizontal: 4, backgroundColor: '#4CAF50' }]}
          onPress={() => navigation.navigate('TransactionHistory', { 
            data: borrower.loan_history, 
            title: `${borrower.full_name}'s Loans`,
            type: 'borrower',
            borrower: borrower
          })}
        >
          <Text style={globalStyles.buttonText}>View Loans</Text>
        </TouchableOpacity>
      </View>

      {/* Show recent loans */}
      {borrower.loan_history.length > 0 && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
          <Text style={[globalStyles.text, { fontWeight: '600', marginBottom: 8 }]}>Recent Loans:</Text>
          {borrower.loan_history.slice(-2).map((loan, index) => {
            const expected = calculateExpectedRepayment(loan);
            return (
              <View key={loan.loan_id} style={{ marginBottom: 8 }}>
                <View style={globalStyles.row}>
                  <Text style={globalStyles.text}>
                    {formatCurrency(loan.amount)} @ {loan.interest_rate_per_month}%/month
                  </Text>
                  <Text style={[
                    globalStyles.text,
                    { color: loan.repayment_status === 'completed' ? '#4CAF50' : '#F44336' }
                  ]}>
                    {loan.repayment_status}
                  </Text>
                </View>
                
                {loan.repayment_status === 'pending' && (
                  <>
                    <Text style={[globalStyles.text, { fontSize: 12, color: '#666' }]}>
                      Current Expected: {formatCurrency(expected.amount)} ({expected.months} months)
                    </Text>
                    <TouchableOpacity
                      style={[globalStyles.button, { backgroundColor: '#FF9800', marginTop: 4 }]}
                      onPress={() => {
                        setSelectedBorrower(borrower);
                        setSelectedLoan(loan);
                        setRepaymentDate(new Date().toISOString().split('T')[0]);
                        setRepaymentModalVisible(true);
                      }}
                    >
                      <Text style={globalStyles.buttonText}>Add Repayment</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.row}>
        <Text style={globalStyles.title}>Borrowers ({borrowers.length})</Text>
        <TouchableOpacity
          style={globalStyles.button}
          onPress={() => setModalVisible(true)}
        >
          <Text style={globalStyles.buttonText}>Add Borrower</Text>
        </TouchableOpacity>
      </View>

      {/* Available Funds Summary */}
      <View style={[globalStyles.card, { backgroundColor: '#e3f2fd' }]}>
        <Text style={[globalStyles.subtitle, { color: '#1976d2' }]}>Available Lending Funds</Text>
        <Text style={[globalStyles.amount, { color: '#1976d2', textAlign: 'center', fontSize: 20 }]}>
          {formatCurrency(lenders.reduce((sum, lender) => sum + lender.getAvailableFunds(), 0))}
        </Text>
        <Text style={[globalStyles.text, { textAlign: 'center', color: '#666' }]}>
          From {lenders.filter(l => l.getAvailableFunds() > 0).length} lenders
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {borrowers.length === 0 ? (
          <View style={[globalStyles.card, { alignItems: 'center' }]}>
            <Text style={globalStyles.text}>No borrowers found</Text>
            <Text style={globalStyles.text}>Add your first borrower to get started</Text>
          </View>
        ) : (
          borrowers.map((borrower) => (
            <BorrowerCard key={borrower._id} borrower={borrower} />
          ))
        )}
      </ScrollView>

      {/* Add Borrower Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={[globalStyles.card, { margin: 20 }]}>
            <Text style={globalStyles.subtitle}>Add New Borrower</Text>
            
            <TextInput
              style={globalStyles.input}
              placeholder="Borrower Full Name"
              value={borrowerName}
              onChangeText={setBorrowerName}
            />
            
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[globalStyles.button, { flex: 1, marginRight: 8, backgroundColor: '#666' }]}
                onPress={() => {
                  setModalVisible(false);
                  setBorrowerName('');
                }}
              >
                <Text style={globalStyles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[globalStyles.button, { flex: 1 }]}
                onPress={handleAddBorrower}
              >
                <Text style={globalStyles.buttonText}>Add Borrower</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Loan Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={loanModalVisible}
        onRequestClose={() => setLoanModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <ScrollView style={{ flex: 1, marginTop: 50, marginBottom: 50 }}>
            <View style={[globalStyles.card, { margin: 20 }]}>
              <Text style={globalStyles.subtitle}>
                Add Loan for {selectedBorrower?.full_name}
              </Text>
              
              <View style={[globalStyles.card, { backgroundColor: '#fff3e0', marginVertical: 12 }]}>
                <Text style={[globalStyles.text, { color: '#f57c00', textAlign: 'center' }]}>
                  💡 You will manually distribute the loan among available l
                  💡 You will manually distribute the loan among available lenders
                </Text>
              </View>
              
              <TextInput
                style={globalStyles.input}
                placeholder="Loan Amount"
                value={loanAmount}
                onChangeText={setLoanAmount}
                keyboardType="numeric"
              />
              
              <TextInput
                style={globalStyles.input}
                placeholder="Interest Rate (% per month)"
                value={interestRatePerMonth}
                onChangeText={setInterestRatePerMonth}
                keyboardType="numeric"
              />
              
              <DatePickerInput
                label="Loan Date"
                date={loanDate}
                onDateChange={setLoanDate}
                maximumDate={new Date()}
              />
              
              <TextInput
                style={globalStyles.input}
                placeholder="Notes (optional)"
                value={loanNotes}
                onChangeText={setLoanNotes}
                multiline
              />
              
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={[globalStyles.button, { flex: 1, marginRight: 8, backgroundColor: '#666' }]}
                  onPress={() => {
                    setLoanModalVisible(false);
                    setSelectedBorrower(null);
                    setLoanAmount('');
                    setInterestRatePerMonth('');
                    setLoanNotes('');
                    setLoanDate(new Date().toISOString().split('T')[0]);
                  }}
                >
                  <Text style={globalStyles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[globalStyles.button, { flex: 1, backgroundColor: '#FF9800' }]}
                  onPress={handleLoanPreview}
                >
                  <Text style={globalStyles.buttonText}>Setup Distribution</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Manual Lender Distribution Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={lenderDistributionModalVisible}
        onRequestClose={() => setLenderDistributionModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <ScrollView style={{ flex: 1, marginTop: 50, marginBottom: 50 }}>
            <View style={[globalStyles.card, { margin: 20 }]}>
              <Text style={globalStyles.subtitle}>Manual Loan Distribution</Text>
              
              <ManualLenderDistribution
                lenders={lenders}
                totalAmount={parseFloat(loanAmount) || 0}
                onDistributionChange={handleDistributionChange}
                initialDistribution={lenderDistribution}
              />
              
              <View style={{ flexDirection: 'row', marginTop: 16 }}>
                <TouchableOpacity
                  style={[globalStyles.button, { flex: 1, marginRight: 8, backgroundColor: '#666' }]}
                  onPress={() => {
                    setLenderDistributionModalVisible(false);
                    setLenderDistribution([]);
                    setDistributionTotal(0);
                  }}
                >
                  <Text style={globalStyles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    globalStyles.button, 
                    { 
                      flex: 1, 
                      backgroundColor: Math.abs(distributionTotal - parseFloat(loanAmount || 0)) < 0.01 && distributionTotal > 0 
                        ? '#4CAF50' : '#999'
                    }
                  ]}
                  onPress={handleConfirmLoan}
                  disabled={Math.abs(distributionTotal - parseFloat(loanAmount || 0)) > 0.01 || distributionTotal === 0}
                >
                  <Text style={globalStyles.buttonText}>Confirm Loan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Repayment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={repaymentModalVisible}
        onRequestClose={() => setRepaymentModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <ScrollView style={{ flex: 1, marginTop: 50, marginBottom: 50 }}>
            <View style={[globalStyles.card, { margin: 20 }]}>
              <Text style={globalStyles.subtitle}>
                Add Repayment for {selectedBorrower?.full_name}
              </Text>
              
              {selectedLoan && (
                <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 6 }}>
                  <Text style={globalStyles.text}>
                    Loan Amount: {formatCurrency(selectedLoan.amount)}
                  </Text>
                  <Text style={globalStyles.text}>
                    Interest Rate: {selectedLoan.interest_rate_per_month}% per month
                  </Text>
                  <Text style={globalStyles.text}>
                    Loan Date: {formatDate(selectedLoan.loan_date)}
                  </Text>
                </View>
              )}
              
              <DatePickerInput
                label="Repayment Date"
                date={repaymentDate}
                onDateChange={setRepaymentDate}
                minimumDate={selectedLoan ? new Date(selectedLoan.loan_date) : null}
                maximumDate={new Date()}
              />
              
              {/* Dynamic Repayment Preview */}
              {repaymentPreview && (
                <View style={[globalStyles.card, { backgroundColor: '#e8f5e8', marginVertical: 12 }]}>
                  <Text style={[globalStyles.subtitle, { color: '#2e7d32', textAlign: 'center' }]}>
                    Expected Repayment Preview
                  </Text>
                  
                  <View style={globalStyles.row}>
                    <Text style={globalStyles.text}>Duration:</Text>
                    <Text style={globalStyles.text}>{repaymentPreview.months} months</Text>
                  </View>
                  
                  <View style={globalStyles.row}>
                    <Text style={globalStyles.text}>Principal:</Text>
                    <Text style={globalStyles.text}>{formatCurrency(repaymentPreview.principal)}</Text>
                  </View>
                  
                  <View style={globalStyles.row}>
                    <Text style={globalStyles.text}>Expected Interest:</Text>
                    <Text style={[globalStyles.amount, { color: '#f57c00' }]}>
                      {formatCurrency(repaymentPreview.interest)}
                    </Text>
                  </View>
                  
                  <View style={[globalStyles.row, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#c8e6c9' }]}>
                    <Text style={[globalStyles.text, { fontWeight: '600' }]}>Expected Total:</Text>
                    <Text style={[globalStyles.amount, { color: '#2e7d32', fontSize: 18, fontWeight: '600' }]}>
                      {formatCurrency(repaymentPreview.expectedTotal)}
                    </Text>
                  </View>
                </View>
              )}
              
              <TextInput
                style={globalStyles.input}
                placeholder="Actual Repayment Amount"
                value={repaymentAmount}
                onChangeText={setRepaymentAmount}
                keyboardType="numeric"
              />
              
              <TextInput
                style={globalStyles.input}
                placeholder="Notes (optional)"
                value={repaymentNotes}
                onChangeText={setRepaymentNotes}
                multiline
              />
              
              <View style={[globalStyles.card, { backgroundColor: '#e8f5e8', marginVertical: 12 }]}>
                <Text style={[globalStyles.text, { color: '#2e7d32', textAlign: 'center' }]}>
                  💡 Amount will be automatically distributed to lenders based on their contribution
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={[globalStyles.button, { flex: 1, marginRight: 8, backgroundColor: '#666' }]}
                  onPress={() => {
                    setRepaymentModalVisible(false);
                    setSelectedBorrower(null);
                    setSelectedLoan(null);
                    setRepaymentAmount('');
                    setRepaymentNotes('');
                    setRepaymentDate(new Date().toISOString().split('T')[0]);
                    setRepaymentPreview(null);
                  }}
                >
                  <Text style={globalStyles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[globalStyles.button, { flex: 1 }]}
                  onPress={handleAddRepayment}
                >
                  <Text style={globalStyles.buttonText}>Process Repayment</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default BorrowerScreen;
