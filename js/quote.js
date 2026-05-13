'use strict';

var typeRadios = document.querySelectorAll('input[name="insuranceType"]');
var allSections = ['auto-fields', 'home-fields', 'life-fields'];
var selectedInsuranceType = null;
var calculateButton = null;

function getValidationMessage(el) {
  if (el.validity.valueMissing) return 'This field is required.';
  if (el.validity.patternMismatch && el.name.toLowerCase().indexOf('zip') !== -1) {
    return 'Please enter a valid 5-digit ZIP code.';
  }
  if (el.validity.patternMismatch) return 'Please use the expected format.';
  if (el.validity.tooShort) return 'Please enter at least ' + el.getAttribute('minlength') + ' characters.';
  if (el.validity.rangeUnderflow) return 'Value must be at least ' + el.getAttribute('min') + '.';
  if (el.validity.rangeOverflow) return 'Value must be ' + el.getAttribute('max') + ' or less.';
  return 'Please enter a valid value.';
}

function clearFieldError(el) {
  if (!el) return;
  el.classList.remove('is-invalid');
  var next = el.nextElementSibling;
  if (next && next.classList.contains('field-error')) {
    next.remove();
  }
}

function showFieldError(el, message) {
  clearFieldError(el);
  el.classList.add('is-invalid');
  var error = document.createElement('div');
  error.className = 'field-error';
  error.textContent = message;
  el.insertAdjacentElement('afterend', error);
}

function clearGroupError(groupRadios) {
  if (!groupRadios || !groupRadios.length) return;
  groupRadios.forEach(function (radio) {
    radio.classList.remove('is-invalid');
  });

  var fieldset = groupRadios[0].closest('fieldset');
  if (!fieldset) return;
  var message = fieldset.querySelector('.field-error.group-error');
  if (message) {
    message.remove();
  }
}

function showGroupError(groupRadios, message) {
  if (!groupRadios || !groupRadios.length) return;
  clearGroupError(groupRadios);

  groupRadios.forEach(function (radio) {
    radio.classList.add('is-invalid');
  });

  var fieldset = groupRadios[0].closest('fieldset');
  if (!fieldset) return;
  var error = document.createElement('div');
  error.className = 'field-error group-error';
  error.textContent = message;
  fieldset.appendChild(error);
}

function clearSectionValidation(section) {
  if (!section) return;
  section.querySelectorAll('.is-invalid').forEach(function (el) {
    el.classList.remove('is-invalid');
  });
  section.querySelectorAll('.field-error').forEach(function (el) {
    el.remove();
  });
}

function setInsuranceType(type) {
  allSections.forEach(function (sectionId) {
    var section = document.getElementById(sectionId);
    if (!section) return;

    section.classList.add('hidden');
    section.querySelectorAll('[data-required]').forEach(function (el) {
      el.removeAttribute('required');
    });
    clearSectionValidation(section);
  });

  selectedInsuranceType = type || null;

  if (selectedInsuranceType) {
    var selected = selectedInsuranceType + '-fields';
    var active = document.getElementById(selected);
    if (active) {
      active.classList.remove('hidden');
      active.querySelectorAll('[data-required]').forEach(function (el) {
        el.setAttribute('required', '');
      });
    }
  }

  if (calculateButton) {
    calculateButton.classList.toggle('hidden', !selectedInsuranceType);
  }
}

function validateActiveSection() {
  if (!selectedInsuranceType) return false;

  var activeSection = document.getElementById(selectedInsuranceType + '-fields');
  if (!activeSection) return false;

  var isValid = true;
  var processedGroups = {};

  activeSection.querySelectorAll('[data-required]').forEach(function (el) {
    if (el.type === 'radio') {
      if (processedGroups[el.name]) return;
      processedGroups[el.name] = true;

      var groupRadios = activeSection.querySelectorAll('input[type="radio"][name="' + el.name + '"]');
      var hasSelection = false;
      groupRadios.forEach(function (radio) {
        if (radio.checked) hasSelection = true;
      });

      if (!hasSelection) {
        showGroupError(groupRadios, 'Please select one option.');
        isValid = false;
      } else {
        clearGroupError(groupRadios);
      }
      return;
    }

    if (!el.checkValidity()) {
      showFieldError(el, getValidationMessage(el));
      isValid = false;
    } else {
      clearFieldError(el);
    }
  });

  return isValid;
}

// ---------------------------------------------------------------------------
// Quote calculation functions
// ---------------------------------------------------------------------------

function calculateAutoQuote(data) {
  var base = 75;

  var age = parseInt(data.age, 10);
  var ageFactor = age < 25 ? 1.5 : age <= 65 ? 1.0 : 1.3;

  var vehicleAge = new Date().getFullYear() - parseInt(data.vehicleYear, 10);
  var vehicleAgeFactor = vehicleAge < 3 ? 1.3 : vehicleAge <= 10 ? 1.0 : 0.8;

  var mileageFactors = {
    'under-5000':   0.8,
    '5000-10000':   1.0,
    '10001-15000':  1.1,
    '15001-20000':  1.3,
    'over-20000':   1.5
  };
  var mileageFactor = mileageFactors[data.annualMileage] || 1.0;

  var recordFactors = {
    'clean':                1.0,
    '1-ticket':             1.2,
    '2-plus-tickets':       1.5,
    'accident-last-3-years': 1.8
  };
  var recordFactor = recordFactors[data.drivingRecord] || 1.0;

  var coverageFactors = { basic: 0.8, standard: 1.0, premium: 1.4 };
  var coverageFactor = coverageFactors[data.coverageLevel] || 1.0;

  return base * ageFactor * vehicleAgeFactor * mileageFactor * recordFactor * coverageFactor;
}

function calculateHomeQuote(data) {
  var homeValue = parseFloat(data.homeValue) || 0;
  var base = (homeValue * 0.003) / 12;

  var yearBuilt = parseInt(data.yearBuilt, 10);
  var yearFactor = yearBuilt < 1970 ? 1.4 : yearBuilt <= 1999 ? 1.1 : 1.0;

  var constructionFactors = {
    'wood-frame': 1.2,
    'brick':      1.0,
    'concrete':   0.9,
    'steel':      0.85
  };
  var constructionFactor = constructionFactors[data.constructionType] || 1.0;

  var sqft = parseFloat(data.squareFootage) || 0;
  var sizeCost = sqft * 0.01;

  var securityFactor  = data.hasSecuritySystem ? 0.95 : 1.0;
  var sprinklerFactor = data.hasFireSprinklers  ? 0.92 : 1.0;

  var coverageFactors = { basic: 0.8, standard: 1.0, premium: 1.4 };
  var coverageFactor = coverageFactors[data.homeCoverageLevel] || 1.0;

  return (base * yearFactor * constructionFactor * securityFactor * sprinklerFactor * coverageFactor) + sizeCost;
}

function calculateLifeQuote(data) {
  var coverageAmount = parseFloat(data.coverageAmount) || 0;
  var base = (coverageAmount * 0.0005) / 12;

  var age = parseInt(data.lifeAge, 10);
  var ageFactor = age <= 30 ? 1.0 : age <= 45 ? 1.5 : age <= 60 ? 2.5 : 4.0;

  var smokerFactor = data.smoker === 'yes' ? 2.0 : 1.0;

  var exerciseFactors = {
    'rarely':     1.3,
    '1-2-week':   1.1,
    '3-4-week':   1.0,
    '5-plus-week': 0.9
  };
  var exerciseFactor = exerciseFactors[data.exerciseFrequency] || 1.0;

  var conditionsFactor = data.preExistingConditions ? 1.5 : 1.0;

  var genderFactors = { male: 1.1, female: 1.0, 'non-binary': 1.05 };
  var genderFactor = genderFactors[data.gender] || 1.0;

  var coverageFactors = { basic: 0.8, standard: 1.0, premium: 1.4 };
  var coverageFactor = coverageFactors[data.lifeCoverageLevel] || 1.0;

  return base * ageFactor * smokerFactor * exerciseFactor * conditionsFactor * genderFactor * coverageFactor;
}

// ---------------------------------------------------------------------------
// Results display helpers
// ---------------------------------------------------------------------------

// Safe DOM insertion  uses textContent to prevent XSS
function addBreakdownRow(tbody, factor, userValue, impact) {
  var row = document.createElement('tr');
  var tdFactor = document.createElement('td');
  var tdValue  = document.createElement('td');
  var tdImpact = document.createElement('td');
  tdFactor.textContent = factor;
  tdValue.textContent  = userValue;
  tdImpact.textContent = impact;
  row.appendChild(tdFactor);
  row.appendChild(tdValue);
  row.appendChild(tdImpact);
  tbody.appendChild(row);
}

function formatCurrency(n) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function impactLabel(factor) {
  if (factor === 1.0) return 'No change';
  var pct = Math.round(Math.abs(factor - 1) * 100);
  return factor > 1 ? '+' + pct + '% surcharge' : '-' + pct + '% discount';
}

function buildAutoBreakdown(tbody, data) {
  var age = parseInt(data.age, 10);
  var ageFactor = age < 25 ? 1.5 : age <= 65 ? 1.0 : 1.3;
  var ageLabel  = age < 25 ? 'young driver surcharge' : age <= 65 ? 'standard rate' : 'senior surcharge';
  addBreakdownRow(tbody, 'Base Rate', '$75/mo', 'Starting point');
  addBreakdownRow(tbody, 'Age', String(age), impactLabel(ageFactor) + ' (' + ageLabel + ')');

  var vehicleAge = new Date().getFullYear() - parseInt(data.vehicleYear, 10);
  var vehicleAgeFactor = vehicleAge < 3 ? 1.3 : vehicleAge <= 10 ? 1.0 : 0.8;
  var vehicleAgeLabel  = vehicleAge < 3 ? 'new vehicle surcharge' : vehicleAge <= 10 ? 'standard rate' : 'older vehicle discount';
  addBreakdownRow(tbody, 'Vehicle Year', data.vehicleYear + ' (' + vehicleAge + ' yrs old)', impactLabel(vehicleAgeFactor) + ' (' + vehicleAgeLabel + ')');

  var mileageLabels = { 'under-5000':'Under 5,000 mi','5000-10000':'5,00010,000 mi','10001-15000':'10,00115,000 mi','15001-20000':'15,00120,000 mi','over-20000':'Over 20,000 mi' };
  var mileageFactors = { 'under-5000':0.8,'5000-10000':1.0,'10001-15000':1.1,'15001-20000':1.3,'over-20000':1.5 };
  addBreakdownRow(tbody, 'Annual Mileage', mileageLabels[data.annualMileage] || data.annualMileage, impactLabel(mileageFactors[data.annualMileage] || 1.0));

  var recordLabels  = { 'clean':'Clean','1-ticket':'1 Ticket','2-plus-tickets':'2+ Tickets','accident-last-3-years':'Accident in Last 3 Yrs' };
  var recordFactors = { 'clean':1.0,'1-ticket':1.2,'2-plus-tickets':1.5,'accident-last-3-years':1.8 };
  addBreakdownRow(tbody, 'Driving Record', recordLabels[data.drivingRecord] || data.drivingRecord, impactLabel(recordFactors[data.drivingRecord] || 1.0));

  var coverageFactors = { basic:0.8, standard:1.0, premium:1.4 };
  addBreakdownRow(tbody, 'Coverage Level', data.coverageLevel.charAt(0).toUpperCase() + data.coverageLevel.slice(1), impactLabel(coverageFactors[data.coverageLevel] || 1.0));
}

function buildHomeBreakdown(tbody, data) {
  addBreakdownRow(tbody, 'Base Rate', 'Home value � 0.3% / 12', 'From $' + Number(data.homeValue).toLocaleString());

  var yearBuilt = parseInt(data.yearBuilt, 10);
  var yearFactor = yearBuilt < 1970 ? 1.4 : yearBuilt <= 1999 ? 1.1 : 1.0;
  addBreakdownRow(tbody, 'Year Built', String(yearBuilt), impactLabel(yearFactor));

  var constructionLabels  = { 'wood-frame':'Wood Frame','brick':'Brick','concrete':'Concrete','steel':'Steel' };
  var constructionFactors = { 'wood-frame':1.2,'brick':1.0,'concrete':0.9,'steel':0.85 };
  addBreakdownRow(tbody, 'Construction Type', constructionLabels[data.constructionType] || data.constructionType, impactLabel(constructionFactors[data.constructionType] || 1.0));

  addBreakdownRow(tbody, 'Square Footage', data.squareFootage + ' sq ft', '+$' + (parseFloat(data.squareFootage) * 0.01).toFixed(2) + '/mo flat add');
  addBreakdownRow(tbody, 'Security System', data.hasSecuritySystem ? 'Yes' : 'No', data.hasSecuritySystem ? impactLabel(0.95) : 'No change');
  addBreakdownRow(tbody, 'Fire Sprinklers',  data.hasFireSprinklers  ? 'Yes' : 'No', data.hasFireSprinklers  ? impactLabel(0.92) : 'No change');

  var coverageFactors = { basic:0.8, standard:1.0, premium:1.4 };
  addBreakdownRow(tbody, 'Coverage Level', data.homeCoverageLevel.charAt(0).toUpperCase() + data.homeCoverageLevel.slice(1), impactLabel(coverageFactors[data.homeCoverageLevel] || 1.0));
}

function buildLifeBreakdown(tbody, data) {
  addBreakdownRow(tbody, 'Base Rate', 'Coverage amount � 0.05% / 12', 'From $' + Number(data.coverageAmount).toLocaleString());

  var age = parseInt(data.lifeAge, 10);
  var ageFactor = age <= 30 ? 1.0 : age <= 45 ? 1.5 : age <= 60 ? 2.5 : 4.0;
  addBreakdownRow(tbody, 'Age', String(age), impactLabel(ageFactor));

  addBreakdownRow(tbody, 'Smoker', data.smoker === 'yes' ? 'Yes' : 'No', impactLabel(data.smoker === 'yes' ? 2.0 : 1.0));

  var exLabels  = { 'rarely':'Rarely','1-2-week':'12�/week','3-4-week':'34�/week','5-plus-week':'5+�/week' };
  var exFactors = { 'rarely':1.3,'1-2-week':1.1,'3-4-week':1.0,'5-plus-week':0.9 };
  addBreakdownRow(tbody, 'Exercise Frequency', exLabels[data.exerciseFrequency] || data.exerciseFrequency, impactLabel(exFactors[data.exerciseFrequency] || 1.0));

  addBreakdownRow(tbody, 'Pre-existing Conditions', data.preExistingConditions ? 'Yes' : 'No', impactLabel(data.preExistingConditions ? 1.5 : 1.0));

  var genderLabels  = { male:'Male', female:'Female', 'non-binary':'Non-binary' };
  var genderFactors = { male:1.1, female:1.0, 'non-binary':1.05 };
  addBreakdownRow(tbody, 'Gender', genderLabels[data.gender] || data.gender, impactLabel(genderFactors[data.gender] || 1.0));

  var coverageFactors = { basic:0.8, standard:1.0, premium:1.4 };
  addBreakdownRow(tbody, 'Coverage Level', data.lifeCoverageLevel.charAt(0).toUpperCase() + data.lifeCoverageLevel.slice(1), impactLabel(coverageFactors[data.lifeCoverageLevel] || 1.0));
}

// ---------------------------------------------------------------------------
// Form submit + reset
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
  var form        = document.getElementById('quoteForm');
  var resultPanel = document.getElementById('quoteResult');
  calculateButton = document.getElementById('calculateQuote');

  allSections.forEach(function (sectionId) {
    var section = document.getElementById(sectionId);
    if (!section) return;
    section.querySelectorAll('[required]').forEach(function (el) {
      el.setAttribute('data-required', '');
      el.removeAttribute('required');
    });
  });

  typeRadios.forEach(function (radio) {
    radio.addEventListener('click', function () {
      if (selectedInsuranceType === this.value) {
        this.checked = false;
        setInsuranceType(null);
        return;
      }

      setInsuranceType(this.value);
    });
  });

  form.addEventListener('input', function (e) {
    var target = e.target;
    if (!target.hasAttribute('data-required') || target.type === 'radio') return;

    if (target.checkValidity()) {
      clearFieldError(target);
    }
  });

  form.addEventListener('change', function (e) {
    var target = e.target;
    if (!target.hasAttribute('data-required')) return;

    if (target.type === 'radio') {
      var section = target.closest('[data-insurance-form]');
      if (!section) return;

      var groupRadios = section.querySelectorAll('input[type="radio"][name="' + target.name + '"]');
      var hasSelection = false;
      groupRadios.forEach(function (radio) {
        if (radio.checked) hasSelection = true;
      });

      if (hasSelection) {
        clearGroupError(groupRadios);
      }
      return;
    }

    if (target.checkValidity()) {
      clearFieldError(target);
    }
  });

  setInsuranceType(null);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateActiveSection()) {
      return;
    }

    var fd   = new FormData(form);
    var data = {};
    fd.forEach(function (val, key) { data[key] = val; });

    // Checkboxes are absent from FormData when unchecked  default to false
    data.hasSecuritySystem    = form.querySelector('#hasSecuritySystem')    ? form.querySelector('#hasSecuritySystem').checked    : false;
    data.hasFireSprinklers    = form.querySelector('#hasFireSprinklers')    ? form.querySelector('#hasFireSprinklers').checked    : false;
    data.preExistingConditions = form.querySelector('#preExistingConditions') ? form.querySelector('#preExistingConditions').checked : false;

    var selectedType = data.insuranceType;
    var monthly, customerName;
    var tbody = document.getElementById('breakdownBody');
    tbody.innerHTML = '';

    if (selectedType === 'auto') {
      monthly      = calculateAutoQuote(data);
      customerName = data.fullName;
      buildAutoBreakdown(tbody, data);
    } else if (selectedType === 'home') {
      monthly      = calculateHomeQuote(data);
      customerName = data.homeFullName;
      buildHomeBreakdown(tbody, data);
    } else if (selectedType === 'life') {
      monthly      = calculateLifeQuote(data);
      customerName = data.lifeFullName;
      buildLifeBreakdown(tbody, data);
    } else {
      return;
    }

    var typeLabels = { auto: 'Auto Insurance', home: 'Home Insurance', life: 'Life Insurance' };

    // Use textContent to safely insert user-supplied values
    document.getElementById('resultName').textContent   = customerName || '';
    document.getElementById('resultType').textContent   = typeLabels[selectedType] || selectedType;
    document.getElementById('resultMonthly').textContent = formatCurrency(monthly);
    document.getElementById('resultAnnual').textContent  = formatCurrency(monthly * 12);

    resultPanel.classList.remove('hidden');
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('resetQuote').addEventListener('click', function () {
    form.reset();
    resultPanel.classList.add('hidden');
    setInsuranceType(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});