// Filename: routes/holidays.js


const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const HolidayEvent = require('../models/HolidayEvent');

// Create holiday/event (admin) - Tested via Postman
router.post('/', auth(['admin']), async (req, res) => {
  try {
    const holidayEvent = new HolidayEvent({
      ...req.body,
      organizationId: req.user.organizationId
    });
    await holidayEvent.save();
    res.status(201).json(holidayEvent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get holidays/events - Tested via Postman
router.get('/', auth(), async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    let query = { organizationId: req.user.organizationId };
    
    if (type) {
      query.type = type;
    }
    
    if (startDate && endDate) {
      query.$or = [
        // Events that start within the date range
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        // Events that end within the date range
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        // Events that span the entire date range
        { startDate: { $lte: new Date(startDate) }, endDate: { $gte: new Date(endDate) } }
      ];
    } else if (startDate) {
      query.endDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.startDate = { $lte: new Date(endDate) };
    }
    
    const holidays = await HolidayEvent.find(query).sort({ startDate: 1 });
    res.json(holidays);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Organization admin can delete holiday - Tested via Postman
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    const holiday = await HolidayEvent.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.user.organizationId
    });
    
    if (!holiday) {
      return res.status(404).json({ error: 'Holiday/event not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;