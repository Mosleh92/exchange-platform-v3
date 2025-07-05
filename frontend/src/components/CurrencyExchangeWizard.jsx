import React, { useState, useEffect } from 'react';
import { Stepper, Step, StepLabel, Button, Box, CircularProgress, Typography } from '@mui/material';
import api from '../services/api';

const steps = ['اطلاعات اولیه', 'روش پرداخت', 'بارگذاری رسید', 'تأیید نهایی'];

function Step1({ formData, setFormData, currencies, customers, onNext }) {
  return (
    <Box>
      <Typography variant="h6" mb={2}>اطلاعات اولیه</Typography>
      <div className="mb-4">
        <label>مشتری:</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={formData.customerId}
          onChange={e => setFormData(f => ({ ...f, customerId: e.target.value }))}
        >
          <option value="">انتخاب کنید</option>
          {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>
      <div className="mb-4 flex gap-2">
        <div className="flex-1">
          <label>از ارز:</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={formData.currencyFrom}
            onChange={e => setFormData(f => ({ ...f, currencyFrom: e.target.value }))}
          >
            {currencies.map(cur => <option key={cur.code} value={cur.code}>{cur.code}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label>به ارز:</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={formData.currencyTo}
            onChange={e => setFormData(f => ({ ...f, currencyTo: e.target.value }))}
          >
            {currencies.map(cur => <option key={cur.code} value={cur.code}>{cur.code}</option>)}
          </select>
        </div>
      </div>
      <div className="mb-4 flex gap-2">
        <div className="flex-1">
          <label>مبلغ:</label>
          <input
            type="number"
            className="border rounded px-3 py-2 w-full"
            value={formData.amountFrom}
            onChange={e => setFormData(f => ({ ...f, amountFrom: e.target.value }))}
          />
        </div>
        <div className="flex-1">
          <label>نوع معامله:</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={formData.type}
            onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}
          >
            <option value="buy">خرید</option>
            <option value="sell">فروش</option>
          </select>
        </div>
      </div>
      <Button variant="contained" color="primary" onClick={onNext} disabled={!formData.customerId || !formData.amountFrom}>
        مرحله بعد
      </Button>
    </Box>
  );
}

function Step2() {
  return <Box>روش پرداخت (در حال توسعه...)</Box>;
}
function Step3() {
  return <Box>بارگذاری رسید (در حال توسعه...)</Box>;
}
function Step4() {
  return <Box>تأیید نهایی (در حال توسعه...)</Box>;
}

const initialForm = {
  customerId: '',
  type: 'buy',
  currencyFrom: 'IRR',
  amountFrom: '',
  currencyTo: 'AED',
};

export default function CurrencyExchangeWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState(initialForm);
  const [currencies, setCurrencies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [curRes, custRes] = await Promise.all([
        api.get('/currencies'),
        api.get('/customers'),
      ]);
      setCurrencies(curRes.data.data);
      setCustomers(custRes.data.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleNext = () => setActiveStep(s => s + 1);
  const handleBack = () => setActiveStep(s => s - 1);

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: 2 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>
      <Box my={4}>
        {loading ? <Box display="flex" justifyContent="center"><CircularProgress /></Box> : (
          <>
            {activeStep === 0 && <Step1 formData={formData} setFormData={setFormData} currencies={currencies} customers={customers} onNext={handleNext} />}
            {activeStep === 1 && <Step2 />}
            {activeStep === 2 && <Step3 />}
            {activeStep === 3 && <Step4 />}
          </>
        )}
      </Box>
      <Box display="flex" justifyContent="space-between">
        <Button onClick={handleBack} disabled={activeStep === 0}>قبلی</Button>
        {/* مرحله آخر: دکمه ثبت */}
        {/* <Button variant="contained" color="success">ثبت نهایی</Button> */}
      </Box>
    </Box>
  );
} 