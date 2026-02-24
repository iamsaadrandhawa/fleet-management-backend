const nodemailer = require('nodemailer');
const Maintenance = require('../models/Maintenance');
const Driver = require('../models/Driver');

class NotificationService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    async checkMaintenanceReminders() {
        try {
            const upcomingMaintenance = await Maintenance.find({
                scheduledDate: {
                    $gte: new Date(),
                    $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
                },
                status: 'scheduled'
            }).populate('vehicle');

            for (const maintenance of upcomingMaintenance) {
                await this.sendMaintenanceReminder(maintenance);
            }
        } catch (error) {
            console.error('Error checking maintenance reminders:', error);
        }
    }

    async checkLicenseExpiry() {
        try {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            const drivers = await Driver.find({
                licenseExpiryDate: {
                    $lte: thirtyDaysFromNow,
                    $gte: new Date()
                }
            }).populate('user');

            for (const driver of drivers) {
                await this.sendLicenseExpiryAlert(driver);
            }
        } catch (error) {
            console.error('Error checking license expiry:', error);
        }
    }

    async sendMaintenanceReminder(maintenance) {
        // Implementation for sending email/notification
        console.log(`Sending maintenance reminder for vehicle: ${maintenance.vehicle.registrationNumber}`);
    }

    async sendLicenseExpiryAlert(driver) {
        // Implementation for sending email/notification
        console.log(`Sending license expiry alert for driver: ${driver.user.email}`);
    }
}

module.exports = new NotificationService();