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
import { Lender } from '../models/Lender';
import { CalculatorService } from '../services/CalculatorService';
import { globalStyles } from '../styles/globalStyles';
import DatePickerInput from '../components/DatePickerInput';

const LenderScreen = ({ navigation }) => {
  const [lenders, setLenders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [investmentModalVisible, setInvestmentModalVisible] = useState(false);
  const [selectedLender, setSelectedLender] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form states
  const [lenderName, setLenderName] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [investmentDate, setInvestmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [investmentNotes, setInvestmentNotes] = useState('');

  const loadLenders = async () => {
    try {
      const loadedLenders = await DatabaseService.getAllLenders();
      setLenders(loadedLenders);
    } catch (error) {
      console.error('Error loading lenders:', error);
      Alert.alert('Error', 'Failed to load lenders');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLenders();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadLenders();
    }, [])
  );

  const handleAddLender = async () => {
    if (!lenderName.trim()) {
      Alert.alert('Error', 'Please enter lender name');
      return;
    }

    try {
      const newLender = new Lender({ full_name: lenderName.trim() });
      await DatabaseService.saveLender(newLender);
      setLenderName('');
      setModalVisible(false);
      loadLenders();
      Alert.alert('Success', 'Lender added successfully');
    } catch (error) {
      console.error('Error adding lender:', error);
      Alert.alert('Error', 'Failed to add lender');
    }
  };

  const handleAddInvestment = async () => {
    if (!investmentAmount || isNaN(parseFloat(investmentAmount))) {
      Alert.alert('Error', 'Please enter valid investment amount');
      return;
    }

    if (parseFloat(investmentAmount) <= 0) {
      Alert.alert('Error', 'Investment amount must be greater than zero');
      return;
    }

    try {
      const amount = parseFloat(investmentAmount);
      const notes = `Investment on ${new Date(investmentDate).toLocaleDateString('en-IN')}${investmentNotes ? ` - ${investmentNotes}` : ''}`;
      
      selectedLender.addTransaction('invest', amount, notes);
      await DatabaseService.saveLender(selectedLender);
      
      setInvestmentAmount('');
      setInvestmentNotes('');
      setInvestmentDate(new Date().toISOString().split('T')[0]);
      setInvestmentModalVisible(false);
      setSelectedLender(null);
      loadLenders();
      Alert.alert('Success', 'Investment added successfully');
    } catch (error) {
      console.error('Error adding investment:', error);
      Alert.alert('Error', 'Failed to add investment');
    }
  };

  const handleDeleteLender = (lender) => {
    Alert.alert(
      'Delete Lender',
      `Are you sure you want to delete ${lender.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteLender(lender._id);
              loadLenders();
              Alert.alert('Success', 'Lender deleted successfully');
            } catch (error) {
              console.error('Error deleting lender:', error);
              Alert.alert('Error', 'Failed to delete lender');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const LenderCard = ({ lender }) => (
    <View style={globalStyles.card}>
      <View style={globalStyles.row}>
        <Text style={globalStyles.subtitle}>{lender.full_name}</Text>
        <TouchableOpacity
          onPress={() => handleDeleteLender(lender)}
          style={{ padding: 4 }}
        >
          <Text style={{ color: '#F44336', fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <View style={globalStyles.row}>
        <Text style={globalStyles.text}>Initial Investment:</Text>
        <Text style={[globalStyles.amount, { color: '#2196F3' }]}>
          {formatCurrency(lender.total_invested)}
        </Text>
      </View>
      
      <View style={globalStyles.row}>
        <Text style={globalStyles.text}>Interest Earned:</Text>
        <Text style={[globalStyles.amount, globalStyles.positiveAmount]}>
          {formatCurrency(lender.total_interest_earned)}
        </Text>
      </View>
      
      <View style={[globalStyles.row, { backgroundColor: '#f0f8ff', padding: 8, borderRadius: 4, marginVertical: 4 }]}>
        <Text style={[globalStyles.text, { fontWeight: '600' }]}>Total Lendable Funds:</Text>
        <Text style={[globalStyles.amount, { color: '#1976d2', fontWeight: '600' }]}>
          {formatCurrency(lender.getTotalLendableFunds())}
        </Text>
      </View>
      
      <View style={globalStyles.row}>
        <Text style={globalStyles.text}>Currently Lent:</Text>
        <Text style={[globalStyles.amount, { color: '#FF9800' }]}>
          {formatCurrency(lender.total_lent)}
        </Text>
      </View>
      
      <View style={[globalStyles.row, { backgroundColor: '#e8f5e8', padding: 8, borderRadius: 4, marginVertical: 4 }]}>
        <Text style={[globalStyles.text, { fontWeight: '600' }]}>Available for Lending:</Text>
        <Text style={[globalStyles.amount, { color: '#4CAF50', fontWeight: '600' }]}>
          {formatCurrency(lender.getAvailableFunds())}
        </Text>
      </View>
      
      <View style={globalStyles.row}>
        <Text style={globalStyles.text}>Utilization Rate:</Text>
        <Text style={[globalStyles.text, { color: '#666' }]}>
          {lender.getUtilizationRate()}%
        </Text>
      </View>
      
      <View style={globalStyles.row}>
        <Text style={globalStyles.text}>ROI:</Text>
        <Text style={[globalStyles.amount, globalStyles.positiveAmount]}>
          {CalculatorService.calculateROI(lender.total_invested, lender.total_interest_earned)}%
        </Text>
      </View>
      
      <View style={globalStyles.row}>
        <Text style={globalStyles.text}>Transactions:</Text>
        <Text style={globalStyles.text}>{lender.transactions.length}</Text>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        <TouchableOpacity
          style={[globalStyles.button, { flex: 1, marginRight: 8 }]}
          onPress={() => {
            setSelectedLender(lender);
            setInvestmentModalVisible(true);
          }}
        >
          <Text style={globalStyles.buttonText}>Add Investment</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[globalStyles.button, { flex: 1, backgroundColor: '#4CAF50' }]}
          onPress={() => navigation.navigate('TransactionHistory', { 
            data: lender.transactions, 
            title: `${lender.full_name}'s Transactions`,
            type: 'lender'
          })}
        >
          <Text style={globalStyles.buttonText}>View History</Text>
        </TouchableOpacity>
      </View>

      {/* Funds Breakdown */}
      {(lender.total_invested > 0 || lender.total_interest_earned > 0) && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
          <Text style={[globalStyles.text, { fontWeight: '600', marginBottom: 8, color: '#1976d2' }]}>
            💰 Funds Breakdown:
          </Text>
          
          <View style={{ backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4 }}>
            <Text style={[globalStyles.text, { fontSize: 12, color: '#666' }]}>
              Initial Investment: {formatCurrency(lender.total_invested)}
            </Text>
            <Text style={[globalStyles.text, { fontSize: 12, color: '#666' }]}>
              + Interest Earned: {formatCurrency(lender.total_interest_earned)}
            </Text>
            <Text style={[globalStyles.text, { fontSize: 12, color: '#666' }]}>
              - Currently Lent: {formatCurrency(lender.total_lent)}
            </Text>
            <View style={{ borderTopWidth: 1, borderTopColor: '#dee2e6', marginTop: 4, paddingTop: 4 }}>
              <Text style={[globalStyles.text, { fontSize: 12, fontWeight: '600', color: '#4CAF50' }]}>
                = Available: {formatCurrency(lender.getAvailableFunds())}
              </Text>
            </View>
          </View>
          
          {lender.total_interest_earned > 0 && (
            <View style={[globalStyles.card, { backgroundColor: '#e8f5e8', marginTop: 8 }]}>
              <Text style={[globalStyles.text, { color: '#2e7d32', textAlign: 'center', fontSize: 12 }]}>
                ✨ Your earned interest of {formatCurrency(lender.total_interest_earned)} is now available for lending!
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.row}>
        <Text style={globalStyles.title}>Lenders ({lenders.length})</Text>
        <TouchableOpacity
          style={globalStyles.button}
          onPress={() => setModalVisible(true)}
        >
          <Text style={globalStyles.buttonText}>Add Lender</Text>
        </TouchableOpacity>
      </View>

      {/* Total Available Funds Summary */}
      <View style={[globalStyles.card, { backgroundColor: '#e8f5e8' }]}>
        <Text style={[globalStyles.subtitle, { color: '#2e7d32' }]}>Total Available Lending Funds</Text>
        <Text style={[globalStyles.amount, { color: '#2e7d32', textAlign: 'center', fontSize: 20 }]}>
          {formatCurrency(lenders.reduce((sum, lender) => sum + lender.getAvailableFunds(), 0))}
        </Text>
        
        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#c8e6c9' }}>
          <View style={globalStyles.row}>
            <Text style={[globalStyles.text, { color: '#2e7d32' }]}>From Investments:</Text>
            <Text style={[globalStyles.text, { color: '#2e7d32' }]}>
              {formatCurrency(lenders.reduce((sum, lender) => sum + Math.max(0, lender.total_invested - lender.total_lent), 0))}
            </Text>
          </View>
          <View style={globalStyles.row}>
            <Text style={[globalStyles.text, { color: '#2e7d32' }]}>From Interest Earned:</Text>
            <Text style={[globalStyles.text, { color: '#2e7d32' }]}>
              {formatCurrency(lenders.reduce((sum, lender) => sum + lender.total_interest_earned, 0))}
            </Text>
          </View>
        </View>
        
        <Text style={[globalStyles.text, { textAlign: 'center', color: '#666', fontSize: 12, marginTop: 4 }]}>
          From {lenders.filter(l => l.getAvailableFunds() > 0).length} lenders
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {lenders.length === 0 ? (
          <View style={[globalStyles.card, { alignItems: 'center' }]}>
            <Text style={globalStyles.text}>No lenders found</Text>
            <Text style={globalStyles.text}>Add your first lender to get started</Text>
          </View>
        ) : (
          lenders.map((lender) => (
            <LenderCard key={lender._id} lender={lender} />
          ))
        )}
      </ScrollView>

      {/* Add Lender Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={[globalStyles.card, { margin: 20 }]}>
            <Text style={globalStyles.subtitle}>Add New Lender</Text>
            
            <TextInput
              style={globalStyles.input}
              placeholder="Lender Full Name"
              value={lenderName}
              onChangeText={setLenderName}
            />
            
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[globalStyles.button, { flex: 1, marginRight: 8, backgroundColor: '#666' }]}
                onPress={() => {
                  setModalVisible(false);
                  setLenderName('');
                }}
              >
                <Text style={globalStyles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[globalStyles.button, { flex: 1 }]}
                onPress={handleAddLender}
              >
                <Text style={globalStyles.buttonText}>Add Lender</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Investment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={investmentModalVisible}
        onRequestClose={() => setInvestmentModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <ScrollView style={{ flex: 1, marginTop: 50, marginBottom: 50 }}>
            <View style={[globalStyles.card, { margin: 20 }]}>
              <Text style={globalStyles.subtitle}>
                Add Investment for {selectedLender?.full_name}
              </Text>
              
              <View style={[globalStyles.card, { backgroundColor: '#e8f5e8', marginVertical: 12 }]}>
                <Text style={[globalStyles.text, { color: '#2e7d32', textAlign: 'center' }]}>
                  💡 Interest will be calculated automatically when borrowers make repayments
                </Text>
              </View>

              {selectedLender && selectedLender.total_interest_earned > 0 && (
                <View style={[globalStyles.card, { backgroundColor: '#fff3e0', marginVertical: 12 }]}>
                  <Text style={[globalStyles.text, { color: '#f57c00', textAlign: 'center' }]}>
                    ✨ You have {formatCurrency(selectedLender.total_interest_earned)} in earned interest available for lending!
                  </Text>
                </View>
              )}
              
              <TextInput
                style={globalStyles.input}
                placeholder="Investment Amount"
                value={investmentAmount}
                onChangeText={setInvestmentAmount}
                keyboardType="numeric"
              />
              
              <DatePickerInput
                label="Investment Date"
                date={investmentDate}
                onDateChange={setInvestmentDate}
                maximumDate={new Date()}
              />
              
              <TextInput
                style={globalStyles.input}
                placeholder="Notes (optional)"
                value={investmentNotes}
                onChangeText={setInvestmentNotes}
                multiline
              />
              
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={[globalStyles.button, { flex: 1, marginRight: 8, backgroundColor: '#666' }]}
                  onPress={() => {
                    setInvestmentModalVisible(false);
                    setSelectedLender(null);
                    setInvestmentAmount('');
                    setInvestmentNotes('');
                    setInvestmentDate(new Date().toISOString().split('T')[0]);
                  }}
                >
                  <Text style={globalStyles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[globalStyles.button, { flex: 1 }]}
                  onPress={handleAddInvestment}
                >
                  <Text style={globalStyles.buttonText}>Add Investment</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default LenderScreen;
