import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CalculatorService } from '../services/CalculatorService';
import { globalStyles } from '../styles/globalStyles';
import DatePickerInput from '../components/DatePickerInput';

const CalculatorScreen = () => {
  const [calculatorType, setCalculatorType] = useState('monthly_interest');
  const [principal, setPrincipal] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [months, setMonths] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [result, setResult] = useState(null);

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const validateInputs = () => {
    if (!principal || isNaN(parseFloat(principal))) {
      Alert.alert('Error', 'Please enter valid principal amount');
      return false;
    }
    if (!monthlyRate || isNaN(parseFloat(monthlyRate))) {
      Alert.alert('Error', 'Please enter valid monthly interest rate');
      return false;
    }
    
    if (calculatorType === 'date_based' && (!startDate || !endDate)) {
      Alert.alert('Error', 'Please enter both start and end dates');
      return false;
    }
    
    if (calculatorType !== 'date_based' && (!months || isNaN(parseFloat(months)))) {
      Alert.alert('Error', 'Please enter valid number of months');
      return false;
    }
    
    return true;
  };

  const calculateResult = () => {
    if (!validateInputs()) return;

    const p = parseFloat(principal);
    const r = parseFloat(monthlyRate);
    let m = parseFloat(months);
    
    // If date-based calculation, calculate months from dates
    if (calculatorType === 'date_based') {
      m = CalculatorService.calculateMonthsBetweenDates(startDate, endDate);
      if (m <= 0) {
        Alert.alert('Error', 'End date must be after start date');
        return;
      }
    }

    let calculationResult = {};

    switch (calculatorType) {
      case 'monthly_interest':
      case 'date_based':
        const interest = CalculatorService.calculateMonthlyInterest(p, r, m);
        calculationResult = {
          type: calculatorType === 'date_based' ? 'Date-based Interest' : 'Monthly Interest',
          principal: p,
          monthly_rate: r,
          months: m,
          interest: interest,
          totalAmount: p + interest,
          monthly_interest: interest / m,
          start_date: calculatorType === 'date_based' ? startDate : null,
          end_date: calculatorType === 'date_based' ? endDate : null
        };
        break;

      case 'compound_monthly':
        const compoundInterest = CalculatorService.calculateCompoundInterestMonthly(p, r, m);
        calculationResult = {
          type: 'Monthly Compound Interest',
          principal: p,
          monthly_rate: r,
          months: m,
          interest: compoundInterest,
          totalAmount: p + compoundInterest,
          monthly_return: compoundInterest / m
        };
        break;

      case 'emi':
        const emi = CalculatorService.calculateEMI(p, r, m);
        const totalPayment = emi * m;
        const totalInterest = totalPayment - p;
        calculationResult = {
          type: 'EMI Calculator (Monthly)',
          principal: p,
          monthly_rate: r,
          tenure_months: m,
          emi: emi,
          totalPayment: totalPayment,
          totalInterest: totalInterest
        };
        break;

      case 'loan_maturity':
        const maturityDetails = CalculatorService.calculateLoanMaturityMonthly(p, r, startDate || new Date(), m);
        calculationResult = {
          type: 'Loan Maturity (Monthly)',
          ...maturityDetails
        };
        break;

      default:
        Alert.alert('Error', 'Invalid calculator type');
        return;
    }

    setResult(calculationResult);
  };

  const clearCalculation = () => {
    setPrincipal('');
    setMonthlyRate('');
    setMonths('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setResult(null);
  };

  const CalculatorTypeButton = ({ type, title, isSelected, onPress }) => (
    <TouchableOpacity
      style={[
        globalStyles.button,
        { flex: 1, marginHorizontal: 2 },
        isSelected ? {} : { backgroundColor: '#666' }
      ]}
      onPress={onPress}
    >
      <Text style={[globalStyles.buttonText, { fontSize: 12 }]}>{title}</Text>
    </TouchableOpacity>
  );

  const ResultCard = ({ result }) => (
    <View style={[globalStyles.card, { backgroundColor: '#e3f2fd' }]}>
      <Text style={[globalStyles.subtitle, { color: '#1976d2', textAlign: 'center' }]}>
        {result.type} Results
      </Text>
      
      <View style={globalStyles.row}>
        <Text style={globalStyles.text}>Principal Amount:</Text>
        <Text style={[globalStyles.amount, { color: '#1976d2' }]}>
          {formatCurrency(result.principal)}
        </Text>
      </View>
      
      <View style={globalStyles.row}>
        <Text style={globalStyles.text}>Monthly Interest Rate:</Text>
        <Text style={globalStyles.text}>{result.monthly_rate}% per month</Text>
      </View>
      
      {result.months && (
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Duration:</Text>
          <Text style={globalStyles.text}>{result.months} months</Text>
        </View>
      )}
      
      {result.start_date && (
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Start Date:</Text>
          <Text style={globalStyles.text}>{new Date(result.start_date).toLocaleDateString('en-IN')}</Text>
        </View>
      )}
      
      {result.end_date && (
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>End Date:</Text>
          <Text style={globalStyles.text}>{new Date(result.end_date).toLocaleDateString('en-IN')}</Text>
        </View>
      )}
      
      {result.interest && (
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Total Interest:</Text>
          <Text style={[globalStyles.amount, globalStyles.positiveAmount]}>
            {formatCurrency(result.interest)}
          </Text>
        </View>
      )}
      
      {result.totalAmount && (
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Total Amount:</Text>
          <Text style={[globalStyles.amount, { color: '#1976d2', fontSize: 20 }]}>
            {formatCurrency(result.totalAmount)}
          </Text>
        </View>
      )}
      
      {result.emi && (
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Monthly EMI:</Text>
          <Text style={[globalStyles.amount, { color: '#1976d2', fontSize: 20 }]}>
            {formatCurrency(result.emi)}
          </Text>
        </View>
      )}
      
      {result.monthly_interest && (
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Average Monthly Interest:</Text>
          <Text style={[globalStyles.amount, globalStyles.positiveAmount]}>
            {formatCurrency(result.monthly_interest)}
          </Text>
        </View>
      )}
      
      {result.totalPayment && (
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Total Payment:</Text>
          <Text style={[globalStyles.amount, globalStyles.negativeAmount]}>
            {formatCurrency(result.totalPayment)}
          </Text>
        </View>
      )}
      
      {result.maturityDate && (
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Maturity Date:</Text>
          <Text style={globalStyles.text}>
            {new Date(result.maturityDate).toLocaleDateString('en-IN')}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>P2P Lending Calculator</Text>
      
      <View style={[globalStyles.card, { backgroundColor: '#fff3e0' }]}>
        <Text style={[globalStyles.text, { color: '#f57c00', textAlign: 'center', fontWeight: '600' }]}>
          💡 All calculations use monthly interest rates
        </Text>
      </View>
      
      {/* Calculator Type Selection */}
      <View style={globalStyles.card}>
        <Text style={globalStyles.subtitle}>Calculator Type</Text>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <CalculatorTypeButton
            type="monthly_interest"
            title="Monthly Interest"
            isSelected={calculatorType === 'monthly_interest'}
            onPress={() => setCalculatorType('monthly_interest')}
          />
          <CalculatorTypeButton
            type="date_based"
            title="Date-based"
            isSelected={calculatorType === 'date_based'}
            onPress={() => setCalculatorType('date_based')}
          />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <CalculatorTypeButton
            type="compound_monthly"
            title="Compound Monthly"
            isSelected={calculatorType === 'compound_monthly'}
            onPress={() => setCalculatorType('compound_monthly')}
          />
          <CalculatorTypeButton
            type="emi"
            title="EMI Calculator"
            isSelected={calculatorType === 'emi'}
            onPress={() => setCalculatorType('emi')}
          />
        </View>
      </View>

      {/* Input Form */}
      <View style={globalStyles.card}>
        <Text style={globalStyles.subtitle}>Enter Details</Text>
        
        <TextInput
          style={globalStyles.input}
          placeholder="Principal Amount (₹)"
          value={principal}
          onChangeText={setPrincipal}
          keyboardType="numeric"
        />
        
        <TextInput
          style={globalStyles.input}
          placeholder="Interest Rate (% per month)"
          value={monthlyRate}
          onChangeText={setMonthlyRate}
          keyboardType="numeric"
        />
        
        {calculatorType === 'date_based' ? (
          <>
            <DatePickerInput
              label="Start Date"
              date={startDate}
              onDateChange={setStartDate}
              maximumDate={new Date()}
            />
            
            <DatePickerInput
              label="End Date"
              date={endDate}
              onDateChange={setEndDate}
              minimumDate={startDate ? new Date(startDate) : null}
              maximumDate={new Date()}
            />
          </>
        ) : (
          <TextInput
            style={globalStyles.input}
            placeholder="Duration (months)"
            value={months}
            onChangeText={setMonths}
            keyboardType="numeric"
          />
        )}
        
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            style={[globalStyles.button, { flex: 1, marginRight: 8 }]}
            onPress={calculateResult}
          >
            <Text style={globalStyles.buttonText}>Calculate</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[globalStyles.button, { flex: 1, backgroundColor: '#666' }]}
            onPress={clearCalculation}
          >
            <Text style={globalStyles.buttonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results */}
      {result && <ResultCard result={result} />}

      {/* Quick Examples */}
      <View style={globalStyles.card}>
        <Text style={globalStyles.subtitle}>Quick Examples (Monthly Rates)</Text>
        
        <TouchableOpacity
          style={[globalStyles.button, { backgroundColor: '#4CAF50', marginBottom: 8 }]}
          onPress={() => {
            setPrincipal('100000');
            setMonthlyRate('2');
            setMonths('12');
            setCalculatorType('monthly_interest');
          }}
        >
          <Text style={globalStyles.buttonText}>₹1L @ 2%/month for 12 months</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[globalStyles.button, { backgroundColor: '#FF9800', marginBottom: 8 }]}
          onPress={() => {
            setPrincipal('500000');
            setMonthlyRate('1.5');
            setMonths('60');
            setCalculatorType('emi');
          }}
        >
          <Text style={globalStyles.buttonText}>₹5L EMI @ 1.5%/month for 5 years</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[globalStyles.button, { backgroundColor: '#9C27B0', marginBottom: 8 }]}
          onPress={() => {
            setPrincipal('200000');
            setMonthlyRate('2.5');
            setStartDate('2024-01-01');
            setEndDate('2024-12-31');
            setCalculatorType('date_based');
          }}
        >
          <Text style={globalStyles.buttonText}>₹2L @ 2.5%/month (Date-based)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[globalStyles.button, { backgroundColor: '#795548' }]}
          onPress={() => {
            setPrincipal('300000');
            setMonthlyRate('1.8');
            setMonths('24');
            setCalculatorType('compound_monthly');
          }}
        >
          <Text style={globalStyles.buttonText}>₹3L @ 1.8%/month compound</Text>
        </TouchableOpacity>
      </View>

      {/* Information */}
      <View style={globalStyles.card}>
        <Text style={globalStyles.subtitle}>Information</Text>
        <Text style={globalStyles.text}>
          • Monthly Interest: Simple interest calculated per month
        </Text>
        <Text style={globalStyles.text}>
          • Date-based: Interest calculated between actual dates
        </Text>
        <Text style={globalStyles.text}>
          • Compound Monthly: Interest compounded every month
        </Text>
        <Text style={globalStyles.text}>
          • EMI: Equal Monthly Installments for loan repayment
        </Text>
        <Text style={[globalStyles.text, { fontWeight: '600', color: '#f57c00', marginTop: 8 }]}>
          Note: All rates are per month, not per annum
        </Text>
      </View>
    </ScrollView>
  );
};

export default CalculatorScreen;
