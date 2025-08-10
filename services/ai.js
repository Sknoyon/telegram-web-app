/**
 * Advanced AI Service
 * Machine learning, predictive analytics, intelligent automation, and AI-powered features
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class AdvancedAIService extends EventEmitter {
    constructor() {
        super();
        this.models = new Map();
        this.trainingData = new Map();
        this.predictions = new Map();
        this.insights = new Map();
        this.automationRules = new Map();
        
        this.config = {
            models: {
                pricePredictor: {
                    type: 'regression',
                    features: ['volume', 'trend', 'sentiment', 'market_cap'],
                    updateInterval: 60 * 60 * 1000 // 1 hour
                },
                demandForecaster: {
                    type: 'timeseries',
                    features: ['sales_history', 'seasonality', 'events'],
                    updateInterval: 24 * 60 * 60 * 1000 // 24 hours
                },
                customerSegmentation: {
                    type: 'clustering',
                    features: ['purchase_history', 'behavior', 'demographics'],
                    updateInterval: 7 * 24 * 60 * 60 * 1000 // 7 days
                },
                fraudDetection: {
                    type: 'classification',
                    features: ['transaction_pattern', 'user_behavior', 'risk_factors'],
                    updateInterval: 60 * 60 * 1000 // 1 hour
                }
            },
            ai: {
                confidenceThreshold: 0.8,
                maxPredictionAge: 24 * 60 * 60 * 1000, // 24 hours
                learningRate: 0.01,
                batchSize: 100
            }
        };
        
        this.initializeAI();
    }

    initializeAI() {
        this.setupModels();
        this.setupAutomationRules();
        this.startModelUpdates();
        
        console.log('🤖 Advanced AI Service initialized');
    }

    // Model Management
    setupModels() {
        // Price Prediction Model
        this.models.set('pricePredictor', {
            type: 'regression',
            weights: this.initializeWeights(4), // 4 features
            bias: 0,
            lastTrained: null,
            accuracy: 0,
            predictions: []
        });
        
        // Demand Forecasting Model
        this.models.set('demandForecaster', {
            type: 'timeseries',
            seasonalFactors: new Array(12).fill(1), // Monthly factors
            trendCoefficient: 0,
            lastTrained: null,
            accuracy: 0,
            forecasts: []
        });
        
        // Customer Segmentation Model
        this.models.set('customerSegmentation', {
            type: 'clustering',
            centroids: [],
            clusters: new Map(),
            lastTrained: null,
            silhouetteScore: 0
        });
        
        // Fraud Detection Model
        this.models.set('fraudDetection', {
            type: 'classification',
            weights: this.initializeWeights(6), // 6 risk factors
            bias: 0,
            threshold: 0.5,
            lastTrained: null,
            accuracy: 0,
            alerts: []
        });
    }

    initializeWeights(size) {
        return Array.from({ length: size }, () => Math.random() * 0.1 - 0.05);
    }

    // Price Prediction
    async predictPrice(productId, marketData) {
        try {
            const model = this.models.get('pricePredictor');
            if (!model) throw new Error('Price prediction model not found');
            
            const features = this.extractPriceFeatures(marketData);
            const prediction = this.linearRegression(features, model.weights, model.bias);
            
            const confidence = this.calculateConfidence(features, model);
            
            const result = {
                productId,
                predictedPrice: Math.max(0, prediction),
                confidence,
                features,
                timestamp: Date.now(),
                modelVersion: model.lastTrained || 'initial'
            };
            
            // Store prediction
            if (!this.predictions.has('price')) {
                this.predictions.set('price', []);
            }
            this.predictions.get('price').push(result);
            
            this.emit('pricePredicted', result);
            return result;
            
        } catch (error) {
            console.error('❌ Price prediction error:', error);
            throw error;
        }
    }

    extractPriceFeatures(marketData) {
        return [
            marketData.volume || 0,
            marketData.trend || 0,
            marketData.sentiment || 0,
            marketData.marketCap || 0
        ];
    }

    // Demand Forecasting
    async forecastDemand(productId, historicalData, timeHorizon = 30) {
        try {
            const model = this.models.get('demandForecaster');
            if (!model) throw new Error('Demand forecasting model not found');
            
            const forecast = [];
            const baseValue = this.calculateBaseDemand(historicalData);
            
            for (let i = 1; i <= timeHorizon; i++) {
                const seasonalFactor = this.getSeasonalFactor(model, i);
                const trendFactor = 1 + (model.trendCoefficient * i);
                const randomFactor = 1 + (Math.random() - 0.5) * 0.1; // ±5% noise
                
                const predictedDemand = baseValue * seasonalFactor * trendFactor * randomFactor;
                
                forecast.push({
                    day: i,
                    demand: Math.max(0, Math.round(predictedDemand)),
                    confidence: this.calculateForecastConfidence(i, timeHorizon)
                });
            }
            
            const result = {
                productId,
                forecast,
                timeHorizon,
                baseDemand: baseValue,
                timestamp: Date.now()
            };
            
            if (!this.predictions.has('demand')) {
                this.predictions.set('demand', []);
            }
            this.predictions.get('demand').push(result);
            
            this.emit('demandForecasted', result);
            return result;
            
        } catch (error) {
            console.error('❌ Demand forecasting error:', error);
            throw error;
        }
    }

    calculateBaseDemand(historicalData) {
        if (!historicalData || historicalData.length === 0) return 10;
        
        const recentData = historicalData.slice(-30); // Last 30 days
        return recentData.reduce((sum, day) => sum + day.sales, 0) / recentData.length;
    }

    getSeasonalFactor(model, dayOffset) {
        const monthIndex = (new Date().getMonth() + Math.floor(dayOffset / 30)) % 12;
        return model.seasonalFactors[monthIndex];
    }

    calculateForecastConfidence(day, horizon) {
        // Confidence decreases with time
        return Math.max(0.3, 0.9 - (day / horizon) * 0.6);
    }

    // Customer Segmentation
    async segmentCustomers(customers) {
        try {
            const model = this.models.get('customerSegmentation');
            if (!model) throw new Error('Customer segmentation model not found');
            
            const features = customers.map(customer => this.extractCustomerFeatures(customer));
            
            // Simple K-means clustering (k=4)
            const k = 4;
            const clusters = this.kMeansClustering(features, k);
            
            const segments = {
                'high_value': { customers: [], characteristics: 'High spending, frequent purchases' },
                'regular': { customers: [], characteristics: 'Moderate spending, regular purchases' },
                'occasional': { customers: [], characteristics: 'Low spending, infrequent purchases' },
                'new': { customers: [], characteristics: 'Recent customers, building profile' }
            };
            
            const segmentNames = Object.keys(segments);
            
            customers.forEach((customer, index) => {
                const clusterIndex = clusters.assignments[index];
                const segmentName = segmentNames[clusterIndex] || 'regular';
                segments[segmentName].customers.push({
                    ...customer,
                    features: features[index],
                    clusterIndex
                });
            });
            
            const result = {
                segments,
                totalCustomers: customers.length,
                clusterCentroids: clusters.centroids,
                timestamp: Date.now()
            };
            
            this.insights.set('customerSegments', result);
            this.emit('customersSegmented', result);
            
            return result;
            
        } catch (error) {
            console.error('❌ Customer segmentation error:', error);
            throw error;
        }
    }

    extractCustomerFeatures(customer) {
        return [
            customer.totalSpent || 0,
            customer.orderCount || 0,
            customer.avgOrderValue || 0,
            customer.daysSinceLastOrder || 365,
            customer.accountAge || 0
        ];
    }

    kMeansClustering(data, k, maxIterations = 100) {
        const dimensions = data[0].length;
        
        // Initialize centroids randomly
        let centroids = Array.from({ length: k }, () => 
            Array.from({ length: dimensions }, () => Math.random())
        );
        
        let assignments = new Array(data.length);
        
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            // Assign points to nearest centroid
            let changed = false;
            for (let i = 0; i < data.length; i++) {
                const distances = centroids.map(centroid => 
                    this.euclideanDistance(data[i], centroid)
                );
                const newAssignment = distances.indexOf(Math.min(...distances));
                
                if (assignments[i] !== newAssignment) {
                    assignments[i] = newAssignment;
                    changed = true;
                }
            }
            
            if (!changed) break;
            
            // Update centroids
            for (let j = 0; j < k; j++) {
                const clusterPoints = data.filter((_, i) => assignments[i] === j);
                if (clusterPoints.length > 0) {
                    centroids[j] = Array.from({ length: dimensions }, (_, dim) => 
                        clusterPoints.reduce((sum, point) => sum + point[dim], 0) / clusterPoints.length
                    );
                }
            }
        }
        
        return { centroids, assignments };
    }

    euclideanDistance(a, b) {
        return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
    }

    // Fraud Detection
    async detectFraud(transaction) {
        try {
            const model = this.models.get('fraudDetection');
            if (!model) throw new Error('Fraud detection model not found');
            
            const riskFactors = this.extractRiskFactors(transaction);
            const riskScore = this.sigmoid(this.linearRegression(riskFactors, model.weights, model.bias));
            
            const isFraud = riskScore > model.threshold;
            const riskLevel = this.getRiskLevel(riskScore);
            
            const result = {
                transactionId: transaction.id,
                riskScore,
                riskLevel,
                isFraud,
                riskFactors,
                recommendations: this.getFraudRecommendations(riskScore, riskFactors),
                timestamp: Date.now()
            };
            
            if (isFraud) {
                model.alerts.push(result);
                this.emit('fraudDetected', result);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Fraud detection error:', error);
            throw error;
        }
    }

    extractRiskFactors(transaction) {
        return [
            transaction.amount > 1000 ? 1 : 0, // High amount
            transaction.isNewUser ? 1 : 0, // New user
            transaction.unusualTime ? 1 : 0, // Unusual time
            transaction.foreignIP ? 1 : 0, // Foreign IP
            transaction.multipleAttempts ? 1 : 0, // Multiple attempts
            transaction.suspiciousPattern ? 1 : 0 // Suspicious pattern
        ];
    }

    getRiskLevel(score) {
        if (score < 0.3) return 'low';
        if (score < 0.6) return 'medium';
        if (score < 0.8) return 'high';
        return 'critical';
    }

    getFraudRecommendations(riskScore, riskFactors) {
        const recommendations = [];
        
        if (riskScore > 0.8) {
            recommendations.push('Block transaction immediately');
            recommendations.push('Require additional verification');
        } else if (riskScore > 0.6) {
            recommendations.push('Manual review required');
            recommendations.push('Request additional documentation');
        } else if (riskScore > 0.3) {
            recommendations.push('Monitor closely');
            recommendations.push('Flag for review');
        }
        
        return recommendations;
    }

    // Intelligent Automation
    setupAutomationRules() {
        // Price optimization rule
        this.automationRules.set('priceOptimization', {
            condition: (data) => data.demandForecast && data.currentPrice,
            action: async (data) => {
                const optimalPrice = this.calculateOptimalPrice(data.demandForecast, data.currentPrice);
                if (Math.abs(optimalPrice - data.currentPrice) > data.currentPrice * 0.05) {
                    return {
                        type: 'price_adjustment',
                        newPrice: optimalPrice,
                        reason: 'demand_optimization'
                    };
                }
                return null;
            },
            enabled: true
        });
        
        // Inventory management rule
        this.automationRules.set('inventoryManagement', {
            condition: (data) => data.currentStock !== undefined && data.demandForecast,
            action: async (data) => {
                const recommendedStock = this.calculateRecommendedStock(data.demandForecast);
                if (data.currentStock < recommendedStock * 0.2) {
                    return {
                        type: 'restock_alert',
                        recommendedQuantity: recommendedStock,
                        urgency: 'high'
                    };
                }
                return null;
            },
            enabled: true
        });
        
        // Customer engagement rule
        this.automationRules.set('customerEngagement', {
            condition: (data) => data.customerSegment && data.lastInteraction,
            action: async (data) => {
                const daysSinceInteraction = (Date.now() - data.lastInteraction) / (24 * 60 * 60 * 1000);
                
                if (daysSinceInteraction > 30 && data.customerSegment === 'high_value') {
                    return {
                        type: 'engagement_campaign',
                        campaign: 'win_back_vip',
                        discount: 15
                    };
                } else if (daysSinceInteraction > 7 && data.customerSegment === 'new') {
                    return {
                        type: 'engagement_campaign',
                        campaign: 'onboarding_followup',
                        discount: 10
                    };
                }
                return null;
            },
            enabled: true
        });
    }

    async executeAutomation(ruleId, data) {
        const rule = this.automationRules.get(ruleId);
        if (!rule || !rule.enabled) return null;
        
        try {
            if (rule.condition(data)) {
                const result = await rule.action(data);
                if (result) {
                    this.emit('automationExecuted', { ruleId, data, result });
                }
                return result;
            }
        } catch (error) {
            console.error(`❌ Automation rule ${ruleId} error:`, error);
        }
        
        return null;
    }

    // AI-Powered Insights
    async generateInsights(dataType, data) {
        try {
            let insights = [];
            
            switch (dataType) {
                case 'sales':
                    insights = this.generateSalesInsights(data);
                    break;
                case 'customers':
                    insights = this.generateCustomerInsights(data);
                    break;
                case 'products':
                    insights = this.generateProductInsights(data);
                    break;
                case 'market':
                    insights = this.generateMarketInsights(data);
                    break;
            }
            
            const result = {
                dataType,
                insights,
                confidence: this.calculateInsightConfidence(insights),
                timestamp: Date.now()
            };
            
            this.insights.set(dataType, result);
            this.emit('insightsGenerated', result);
            
            return result;
            
        } catch (error) {
            console.error('❌ Insight generation error:', error);
            throw error;
        }
    }

    generateSalesInsights(salesData) {
        const insights = [];
        
        // Trend analysis
        const trend = this.calculateTrend(salesData.map(d => d.revenue));
        if (trend > 0.1) {
            insights.push({
                type: 'positive_trend',
                message: `Sales revenue is trending upward by ${(trend * 100).toFixed(1)}%`,
                impact: 'positive',
                confidence: 0.85
            });
        } else if (trend < -0.1) {
            insights.push({
                type: 'negative_trend',
                message: `Sales revenue is declining by ${Math.abs(trend * 100).toFixed(1)}%`,
                impact: 'negative',
                confidence: 0.85
            });
        }
        
        // Seasonality detection
        const seasonality = this.detectSeasonality(salesData);
        if (seasonality.strength > 0.3) {
            insights.push({
                type: 'seasonality',
                message: `Strong seasonal pattern detected with peak in ${seasonality.peakMonth}`,
                impact: 'informational',
                confidence: seasonality.strength
            });
        }
        
        return insights;
    }

    generateCustomerInsights(customerData) {
        const insights = [];
        
        // Customer lifetime value analysis
        const avgCLV = customerData.reduce((sum, c) => sum + (c.totalSpent || 0), 0) / customerData.length;
        const highValueCustomers = customerData.filter(c => (c.totalSpent || 0) > avgCLV * 2).length;
        
        if (highValueCustomers > customerData.length * 0.2) {
            insights.push({
                type: 'high_value_concentration',
                message: `${highValueCustomers} customers (${((highValueCustomers/customerData.length)*100).toFixed(1)}%) are high-value`,
                impact: 'positive',
                confidence: 0.9
            });
        }
        
        // Churn risk analysis
        const churnRisk = customerData.filter(c => {
            const daysSinceLastOrder = (Date.now() - (c.lastOrderDate || 0)) / (24 * 60 * 60 * 1000);
            return daysSinceLastOrder > 60;
        }).length;
        
        if (churnRisk > customerData.length * 0.3) {
            insights.push({
                type: 'churn_risk',
                message: `${churnRisk} customers are at risk of churning`,
                impact: 'negative',
                confidence: 0.75
            });
        }
        
        return insights;
    }

    // Utility Functions
    linearRegression(features, weights, bias) {
        return features.reduce((sum, feature, i) => sum + feature * weights[i], bias);
    }

    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }

    calculateConfidence(features, model) {
        // Simple confidence based on feature variance and model age
        const featureVariance = this.calculateVariance(features);
        const modelAge = Date.now() - (model.lastTrained || 0);
        const ageDecay = Math.exp(-modelAge / (7 * 24 * 60 * 60 * 1000)); // Decay over 7 days
        
        return Math.min(0.95, 0.5 + (1 - featureVariance) * 0.3 + ageDecay * 0.2);
    }

    calculateVariance(array) {
        const mean = array.reduce((sum, val) => sum + val, 0) / array.length;
        const variance = array.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / array.length;
        return Math.sqrt(variance);
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope / (sumY / n); // Normalized slope
    }

    detectSeasonality(data) {
        // Simple seasonality detection
        const monthlyAvg = new Array(12).fill(0);
        const monthlyCounts = new Array(12).fill(0);
        
        data.forEach(point => {
            const month = new Date(point.date).getMonth();
            monthlyAvg[month] += point.revenue || 0;
            monthlyCounts[month]++;
        });
        
        for (let i = 0; i < 12; i++) {
            if (monthlyCounts[i] > 0) {
                monthlyAvg[i] /= monthlyCounts[i];
            }
        }
        
        const overallAvg = monthlyAvg.reduce((sum, val) => sum + val, 0) / 12;
        const variance = monthlyAvg.reduce((sum, val) => sum + Math.pow(val - overallAvg, 2), 0) / 12;
        const strength = Math.sqrt(variance) / overallAvg;
        
        const peakMonth = monthlyAvg.indexOf(Math.max(...monthlyAvg));
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        return {
            strength: Math.min(1, strength),
            peakMonth: monthNames[peakMonth]
        };
    }

    calculateOptimalPrice(demandForecast, currentPrice) {
        // Simple price optimization based on demand elasticity
        const avgDemand = demandForecast.reduce((sum, day) => sum + day.demand, 0) / demandForecast.length;
        const demandGrowth = (demandForecast[demandForecast.length - 1].demand - demandForecast[0].demand) / demandForecast[0].demand;
        
        if (demandGrowth > 0.1) {
            return currentPrice * 1.05; // Increase price by 5%
        } else if (demandGrowth < -0.1) {
            return currentPrice * 0.95; // Decrease price by 5%
        }
        
        return currentPrice;
    }

    calculateRecommendedStock(demandForecast) {
        const totalDemand = demandForecast.reduce((sum, day) => sum + day.demand, 0);
        const safetyStock = totalDemand * 0.2; // 20% safety stock
        return Math.ceil(totalDemand + safetyStock);
    }

    calculateInsightConfidence(insights) {
        if (insights.length === 0) return 0;
        return insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length;
    }

    startModelUpdates() {
        // Update models periodically
        setInterval(() => {
            this.updateModels();
        }, 60 * 60 * 1000); // Every hour
    }

    async updateModels() {
        console.log('🔄 Updating AI models...');
        
        for (const [modelName, model] of this.models.entries()) {
            try {
                await this.retrainModel(modelName);
            } catch (error) {
                console.error(`❌ Failed to update model ${modelName}:`, error);
            }
        }
    }

    async retrainModel(modelName) {
        const model = this.models.get(modelName);
        if (!model) return;
        
        // Simulate model retraining
        model.lastTrained = Date.now();
        model.accuracy = Math.min(0.95, model.accuracy + Math.random() * 0.05);
        
        this.emit('modelRetrained', { modelName, accuracy: model.accuracy });
    }

    // API Methods
    getModelStatus() {
        const status = {};
        for (const [name, model] of this.models.entries()) {
            status[name] = {
                type: model.type,
                lastTrained: model.lastTrained,
                accuracy: model.accuracy || 0,
                isActive: model.lastTrained !== null
            };
        }
        return status;
    }

    getPredictions(type, limit = 10) {
        const predictions = this.predictions.get(type) || [];
        return predictions.slice(-limit).reverse();
    }

    getInsights(type) {
        return this.insights.get(type);
    }

    getAutomationRules() {
        const rules = {};
        for (const [name, rule] of this.automationRules.entries()) {
            rules[name] = {
                enabled: rule.enabled,
                description: rule.description || 'No description available'
            };
        }
        return rules;
    }

    // Shutdown
    shutdown() {
        console.log('🤖 AI service shutdown completed');
    }
}

module.exports = AdvancedAIService;