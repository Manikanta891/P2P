import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, Alert } from 'react-native';
import { globalStyles } from '../styles/globalStyles';

const ManualLenderDistribution = ({ 
  lenders, 
  totalAmount, 
  onDistributionChange,
  initialDistribution = []
}) => {
  const [distribution, setDistribution] = useState({});
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize distribution only once
  useEffect(() => {
    if (!isInitialized && lenders.length > 0) {
      const initialDist = {};
      lenders.forEach(lender => {
        const existing = initialDistribution.find(d => d.lender_id === lender._id);
        initialDist[lender._id] = existing ? existing.amount_given.toString() : '0';
      });
      setDistribution(initialDist);
      setIsInitialized(true);
    }
  }, [lenders, initialDistribution, isInitialized]);

  // Calculate total and notify parent - use useCallback to prevent infinite loops
  const updateDistribution = useCallback(() => {
    if (!isInitialized) return;

    const total = Object.values(distribution).reduce((sum, amount) => {
      const num = parseFloat(amount) || 0;
      return sum + num;
    }, 0);
    
    setTotalAllocated(total);

    // Create distribution array for parent component
    const distributionArray = lenders.map(lender => {
      const amount = parseFloat(distribution[lender._id]) || 0;
      return {
        lender_id: lender._id,
        lender_name: lender.full_name,
        amount_given: amount,
        available_funds: lender.getAvailableFunds(),
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
      };
    }).filter(d => d.amount_given > 0);

    onDistributionChange(distributionArray, total);
  }, [distribution, totalAmount, lenders, onDistributionChange, isInitialized]);

  // Update when distribution changes
  useEffect(() => {
    updateDistribution();
  }, [updateDistribution]);

  const handleAmountChange = (lenderId, amount) => {
    const numAmount = parseFloat(amount) || 0;
    const lender = lenders.find(l => l._id === lenderId);
    
    if (lender && numAmount > lender.getAvailableFunds()) {
      Alert.alert(
        'Insufficient Funds',
        `${lender.full_name} has only ₹${lender.getAvailableFunds().toLocaleString()} available for lending`
      );
      return;
    }

    setDistribution(prev => ({
      ...prev,
      [lenderId]: amount
    }));
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getRemainingAmount = () => {
    return totalAmount - totalAllocated;
  };

  const isValidDistribution = () => {
    return Math.abs(totalAllocated - totalAmount) < 0.01 && totalAllocated > 0;
  };

  if (!isInitialized) {
    return (
      <View style={[globalStyles.card, { alignItems: 'center' }]}>
        <Text style={globalStyles.text}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ maxHeight: 400 }}>
      <View style={[globalStyles.card, { backgroundColor: '#e3f2fd' }]}>
        <Text style={[globalStyles.subtitle, { color: '#1976d2', textAlign: 'center' }]}>
          Manual Lender Distribution
        </Text>
        
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Total Loan Amount:</Text>
          <Text style={[globalStyles.amount, { color: '#1976d2' }]}>
            {formatCurrency(totalAmount)}
          </Text>
        </View>
        
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Total Allocated:</Text>
          <Text style={[
            globalStyles.amount,
            { color: isValidDistribution() ? '#4CAF50' : '#F44336' }
          ]}>
            {formatCurrency(totalAllocated)}
          </Text>
        </View>
        
        <View style={globalStyles.row}>
          <Text style={globalStyles.text}>Remaining:</Text>
          <Text style={[
            globalStyles.amount,
            { color: getRemainingAmount() === 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {formatCurrency(getRemainingAmount())}
          </Text>
        </View>
      </View>

      {lenders.filter(lender => lender.getAvailableFunds() > 0).map((lender) => (
        <View key={lender._id} style={[globalStyles.card, { marginBottom: 8 }]}>
          <View style={globalStyles.row}>
            <Text style={[globalStyles.subtitle, { flex: 1 }]}>
              {lender.full_name}
            </Text>
            <Text style={[globalStyles.text, { color: '#666' }]}>
              Available: {formatCurrency(lender.getAvailableFunds())}
            </Text>
          </View>
          
          {/* Show funds breakdown */}
          <View style={{ backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4, marginVertical: 8 }}>
            <Text style={[globalStyles.text, { fontSize: 12, color: '#666', fontWeight: '600' }]}>
              Funds Breakdown:
            </Text>
            <Text style={[globalStyles.text, { fontSize: 11, color: '#666' }]}>
              Investment: {formatCurrency(lender.total_invested)}
            </Text>
            {lender.total_interest_earned > 0 && (
              <Text style={[globalStyles.text, { fontSize: 11, color: '#4CAF50' }]}>
                + Interest Earned: {formatCurrency(lender.total_interest_earned)}
              </Text>
            )}
            {lender.total_lent > 0 && (
              <Text style={[globalStyles.text, { fontSize: 11, color: '#FF9800' }]}>
                - Currently Lent: {formatCurrency(lender.total_lent)}
              </Text>
            )}
            <Text style={[globalStyles.text, { fontSize: 11, color: '#2196F3', fontWeight: '600' }]}>
              = Available: {formatCurrency(lender.getAvailableFunds())}
            </Text>
          </View>
          
          <View style={{ marginTop: 8 }}>
                      <Text style={[globalStyles.text, { marginBottom: 4 }]}>
              Amount to lend:
            </Text>
            <TextInput
              style={[
                globalStyles.input,
                {
                  borderColor: parseFloat(distribution[lender._id]) > lender.getAvailableFunds() 
                    ? '#F44336' : '#ddd'
                }
              ]}
              placeholder="0"
              value={distribution[lender._id] || ''}
              onChangeText={(amount) => handleAmountChange(lender._id, amount)}
              keyboardType="numeric"
            />
            
            {parseFloat(distribution[lender._id]) > 0 && totalAmount > 0 && (
              <Text style={[globalStyles.text, { fontSize: 12, color: '#666', marginTop: 4 }]}>
                Percentage: {((parseFloat(distribution[lender._id]) / totalAmount) * 100).toFixed(1)}%
              </Text>
            )}
          </View>
        </View>
      ))}

      {lenders.filter(lender => lender.getAvailableFunds() > 0).length === 0 && (
        <View style={[globalStyles.card, { alignItems: 'center' }]}>
          <Text style={[globalStyles.text, { color: '#F44336' }]}>
            No lenders with available funds
          </Text>
          <Text style={[globalStyles.text, { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 4 }]}>
            Lenders need to add investments or earn interest to have funds available for lending
          </Text>
        </View>
      )}

      {!isValidDistribution() && totalAllocated > 0 && (
        <View style={[globalStyles.card, { backgroundColor: '#ffebee' }]}>
          <Text style={[globalStyles.text, { color: '#d32f2f', textAlign: 'center' }]}>
            ⚠️ Total allocation must equal loan amount
          </Text>
        </View>
      )}

      {/* Summary of total available funds */}
      <View style={[globalStyles.card, { backgroundColor: '#e8f5e8', marginTop: 8 }]}>
        <Text style={[globalStyles.subtitle, { color: '#2e7d32', textAlign: 'center' }]}>
          💰 Total Available Funds Summary
        </Text>
        
        <View style={globalStyles.row}>
          <Text style={[globalStyles.text, { color: '#2e7d32' }]}>From Investments:</Text>
          <Text style={[globalStyles.text, { color: '#2e7d32' }]}>
            {formatCurrency(
              lenders.reduce((sum, lender) => 
                sum + Math.max(0, lender.total_invested - lender.total_lent), 0
              )
            )}
          </Text>
        </View>
        
        <View style={globalStyles.row}>
          <Text style={[globalStyles.text, { color: '#2e7d32' }]}>From Interest Earned:</Text>
          <Text style={[globalStyles.text, { color: '#2e7d32' }]}>
            {formatCurrency(
              lenders.reduce((sum, lender) => sum + lender.total_interest_earned, 0)
            )}
          </Text>
        </View>
        
        <View style={[globalStyles.row, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#c8e6c9' }]}>
          <Text style={[globalStyles.text, { color: '#2e7d32', fontWeight: '600' }]}>Total Available:</Text>
          <Text style={[globalStyles.amount, { color: '#2e7d32', fontWeight: '600' }]}>
            {formatCurrency(
              lenders.reduce((sum, lender) => sum + lender.getAvailableFunds(), 0)
            )}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default ManualLenderDistribution;

