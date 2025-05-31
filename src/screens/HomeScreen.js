import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DatabaseService } from '../services/DatabaseService';
import { CalculatorService } from '../services/CalculatorService';
import { globalStyles } from '../styles/globalStyles';

const HomeScreen = ({ navigation }) => {
  const [dashboardData, setDashboardData] = useState({
    totalLenders: 0,
    totalBorrowers: 0,
    totalInvested: 0,
    totalInterestEarned: 0,
    totalLendableFunds: 0,
    totalAvailableFunds: 0,
    totalCurrentlyLent: 0,
    totalLoansGiven: 0,
    totalRepaid: 0,
    outstandingAmount: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const lenders = await DatabaseService.getAllLenders();
      const borrowers = await DatabaseService.getAllBorrowers();

      const totalInvested = lenders.reduce((sum, lender) => sum + lender.total_invested, 0);
      const totalInterestEarned = lenders.reduce((sum, lender) => sum + lender.total_interest_earned, 0);
      const totalLendableFunds = lenders.reduce((sum, lender) => sum + lender.getTotalLendableFunds(), 0);
      const totalAvailableFunds = lenders.reduce((sum, lender) => sum + lender.getAvailableFunds(), 0);
      const totalCurrentlyLent = lenders.reduce((sum, lender) => sum + lender.total_lent, 0);
      
      const totalLoansGiven = borrowers.reduce((sum, borrower) => sum + borrower.getTotalBorrowed(), 0);
      const totalRepaid = borrowers.reduce((sum, borrower) => sum + borrower.getTotalRepaid(), 0);
      const outstandingAmount = borrowers.reduce((sum, borrower) => sum + borrower.getOutstandingAmount(), 0);

      setDashboardData({
        totalLenders: lenders.length,
        totalBorrowers: borrowers.length,
        totalInvested,
        totalInterestEarned,
        totalLendableFunds,
        totalAvailableFunds,
        totalCurrentlyLent,
        totalLoansGiven,
        totalRepaid,
        outstandingAmount,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const DashboardCard = ({ title, value, color = '#2196F3', onPress, subtitle = null }) => (
    <TouchableOpacity style={[globalStyles.card, { borderLeftWidth: 4, borderLeftColor: color }]} onPress={onPress}>
      <Text style={globalStyles.subtitle}>{title}</Text>
      <Text style={[globalStyles.amount, { color, fontSize: 20 }]}>{value}</Text>
      {subtitle && (
        <Text style={[globalStyles.text, { fontSize: 12, color: '#666', marginTop: 4 }]}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={globalStyles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={globalStyles.title}>P2P Lending Dashboard</Text>

      <DashboardCard
        title="Total Lenders"
        value={dashboardData.totalLenders}
        color="#4CAF50"
        onPress={() => navigation.navigate('Lenders')}
      />

      <DashboardCard
        title="Total Borrowers"
        value={dashboardData.totalBorrowers}
        color="#FF9800"
        onPress={() => navigation.navigate('Borrowers')}
      />

      <DashboardCard
        title="Total Invested"
        value={formatCurrency(dashboardData.totalInvested)}
        color="#2196F3"
        subtitle="Initial investments by lenders"
      />

      <DashboardCard
        title="Interest Earned"
        value={formatCurrency(dashboardData.totalInterestEarned)}
        color="#4CAF50"
        subtitle="Available for re-lending"
      />

      <DashboardCard
        title="Total Lendable Funds"
        value={formatCurrency(dashboardData.totalLendableFunds)}
        color="#9C27B0"
        subtitle="Investments + Interest Earned"
      />

      <DashboardCard
        title="Available for Lending"
        value={formatCurrency(dashboardData.totalAvailableFunds)}
        color="#00BCD4"
        subtitle="Ready to lend to borrowers"
      />

      <DashboardCard
        title="Currently Lent"
        value={formatCurrency(dashboardData.totalCurrentlyLent)}
        color="#FF5722"
        subtitle="Active loans to borrowers"
      />

      <DashboardCard
        title="Total Loans Given"
        value={formatCurrency(dashboardData.totalLoansGiven)}
        color="#9C27B0"
      />

      <DashboardCard
        title="Total Repaid"
        value={formatCurrency(dashboardData.totalRepaid)}
        color="#4CAF50"
      />

      <DashboardCard
        title="Outstanding Amount"
        value={formatCurrency(dashboardData.outstandingAmount)}
        color="#F44336"
      />

      <View style={globalStyles.card}>
        <Text style={globalStyles.subtitle}>Quick Actions</Text>
        <TouchableOpacity
          style={globalStyles.button}
          onPress={() => navigation.navigate('Calculator')}
        >
          <Text style={globalStyles.buttonText}>Open Calculator</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[globalStyles.button, { backgroundColor: '#4CAF50' }]}
          onPress={() => navigation.navigate('Lenders')}
        >
          <Text style={globalStyles.buttonText}>Manage Lenders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[globalStyles.button, { backgroundColor: '#FF9800' }]}
          onPress={() => navigation.navigate('Borrowers')}
        >
          <Text style={globalStyles.buttonText}>Manage Borrowers</Text>
        </TouchableOpacity>
      </View>

      {/* Enhanced Portfolio Summary */}
      {dashboardData.totalInvested > 0 && (
        <View style={globalStyles.card}>
          <Text style={globalStyles.subtitle}>💰 Portfolio Summary</Text>
          
          <View style={globalStyles.row}>
            <Text style={globalStyles.text}>Initial Investments:</Text>
            <Text style={[globalStyles.amount, { color: '#2196F3' }]}>
              {formatCurrency(dashboardData.totalInvested)}
            </Text>
          </View>
          
          <View style={globalStyles.row}>
            <Text style={globalStyles.text}>Interest Earned:</Text>
            <Text style={[globalStyles.amount, globalStyles.positiveAmount]}>
              {formatCurrency(dashboardData.totalInterestEarned)}
            </Text>
          </View>
          
          <View style={[globalStyles.row, { backgroundColor: '#f0f8ff', padding: 8, borderRadius: 4, marginVertical: 4 }]}>
            <Text style={[globalStyles.text, { fontWeight: '600' }]}>Total Portfolio Value:</Text>
            <Text style={[globalStyles.amount, { color: '#1976d2', fontWeight: '600' }]}>
              {formatCurrency(dashboardData.totalInvested + dashboardData.totalInterestEarned)}
            </Text>
          </View>
          
          <View style={globalStyles.row}>
            <Text style={globalStyles.text}>Currently Lent:</Text>
            <Text style={[globalStyles.amount, { color: '#FF9800' }]}>
              {formatCurrency(dashboardData.totalCurrentlyLent)}
            </Text>
          </View>
          
          <View style={[globalStyles.row, { backgroundColor: '#e8f5e8', padding: 8, borderRadius: 4, marginVertical: 4 }]}>
            <Text style={[globalStyles.text, { fontWeight: '600' }]}>Available for Lending:</Text>
            <Text style={[globalStyles.amount, { color: '#4CAF50', fontWeight: '600' }]}>
              {formatCurrency(dashboardData.totalAvailableFunds)}
            </Text>
          </View>
          
          <View style={globalStyles.row}>
            <Text style={globalStyles.text}>Overall ROI:</Text>
            <Text style={[globalStyles.amount, globalStyles.positiveAmount]}>
              {CalculatorService.calculateROI(dashboardData.totalInvested, dashboardData.totalInterestEarned)}%
            </Text>
          </View>
          
          {dashboardData.totalLendableFunds > 0 && (
            <View style={globalStyles.row}>
              <Text style={globalStyles.text}>Fund Utilization:</Text>
              <Text style={[globalStyles.text, { color: '#666' }]}>
                {((dashboardData.totalCurrentlyLent / dashboardData.totalLendableFunds) * 100).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Interest Reinvestment Info */}
      {dashboardData.totalInterestEarned > 0 && (
        <View style={[globalStyles.card, { backgroundColor: '#e8f5e8' }]}>
          <Text style={[globalStyles.subtitle, { color: '#2e7d32' }]}>✨ Interest Reinvestment</Text>
          <Text style={[globalStyles.text, { color: '#2e7d32', textAlign: 'center' }]}>
            Your lenders have earned {formatCurrency(dashboardData.totalInterestEarned)} in interest, 
            which is now available for lending to new borrowers!
          </Text>
          <Text style={[globalStyles.text, { color: '#666', textAlign: 'center', fontSize: 12, marginTop: 4 }]}>
            This creates a compounding effect for your P2P lending business.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default HomeScreen;
