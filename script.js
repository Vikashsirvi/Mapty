'use strict';

class Workout {
  clicks = 0;
  constructor(coords, distance, duration, date, id) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
    if (!date) {
      this.date = new Date();
    } else {
      this.date = new Date(date);
    }
    if (!id) {
      this.id = (Date.now() + '').slice(-10);
    } else {
      this.id = id;
    }
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence, date, id) {
    super(coords, distance, duration, date, id);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation, date, id) {
    super(coords, distance, duration, date, id);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/hr
    this.speed = this.distance / this.duration / 60;
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycle1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycle1);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Application Architecture
const form = document.querySelector('.form');
const container = document.querySelector('#map');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetBtn = document.querySelector('.reset_icon');
const sortEl = document.querySelector('.sort__input');
const sortUp = document.querySelector('.sort__up');
const sortDown = document.querySelector('.sort__down');
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  constructor() {
    //Get user's position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //Attach event Handlers
    container.addEventListener('click', loadnewWorkout.bind(this));
    function loadnewWorkout() {
      form.addEventListener('submit', this._newWorkout.bind(this));
    }
    resetBtn.addEventListener('click', this._removeAll.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._removeWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
    sortEl.addEventListener('change', this._sortWorkout.bind(this));
    sortUp.addEventListener('click', this._sortingOrder.bind(this));
    sortDown.addEventListener('click', this._sortingOrder.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('could not get your location');
        }
      );
    }
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    // console.log(map);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(mapE) {
    if (mapE) {
      this.#mapEvent = mapE;
    }
    inputType.removeAttribute('disabled');
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    console.log('called');
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    //get data from form

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    //Check if data is valid

    //if workout is running create running object
    if (type === 'running') {
      //Check If data is valid
      const cadence = +inputCadence.value;
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //if workout is cycling create cycling object

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //add new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    //Render workout on map as marker

    this._renderWorkoutMarker(workout);
    //Render workout on list
    this._renderWorkout(workout);
    //hide the form-Clear input fields
    this._hideForm();
    //Set local Storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" >
    <h2 class="workout__title" data-id="${workout.id}">${
      workout.description
    }</h2>
    <div class="action-icon">
    <span class="workout__icon remove__icon" data-id="${
      workout.id
    }"><img src="https://img.icons8.com/color/24/000000/delete-sign--v1.png"/></span>
    <span class="workout__icon edit__icon" data-id="${
      workout.id
    }"><img src="https://img.icons8.com/color/24/000000/map-editing.png"/></span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃' : '🚴'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;
    if (workout.type === 'running') {
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    }
    if (workout.type === 'cycling') {
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevation}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout__title');
    // console.log(workoutEl);
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    // console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    //using public interface
    // workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this._parsingData(data);
    console.log(this.#workouts);
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  //................................................///
  _parsingData(data) {
    let newWorkout;
    data.forEach(workout => {
      if (workout.type === 'running') {
        newWorkout = new Running(
          workout.coords,
          workout.distance,
          workout.duration,
          workout.cadence,
          workout.date,
          workout.id
        );
      }
      if (workout.type === 'cycling') {
        newWorkout = new Cycling(
          workout.coords,
          workout.distance,
          workout.duration,
          workout.elevation,
          workout.date,
          workout.id
        );
      }
      this.#workouts.push(newWorkout);
    });
  }
  _removeWorkout(e) {
    const removeEl = e.target.closest('.remove__icon');
    if (!removeEl) return;
    //getting workout id
    const remworkouts = this.#workouts.filter(
      work => work.id !== removeEl.dataset.id
    );
    //removing localStorage
    localStorage.removeItem('workouts');

    this.#workouts = remworkouts;
    //Updating Local Storage
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    //Deleting All Elements
    this._resetElement();
    //rendering remaining elements
    this._updateWorkouts(remworkouts);
  }
  _editWorkout(e) {
    const editEl = e.target.closest('.edit__icon');
    if (!editEl) return;
    const workoutData = this.#workouts.find(
      work => work.id === editEl.dataset.id
    );
    let workout = {};
    workout.type = workoutData.type;
    workout.distance = workoutData.distance;
    workout.duration = workoutData.duration;
    workout.id = workoutData.id;
    if (workoutData.cadence) {
      workout.cadence = workoutData.cadence;
    }
    if (workoutData.elevation) {
      workout.elevation = workoutData.elevation;
    }
    inputType.value = workout.type;
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    if (workout.type === 'running') {
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
      inputCadence.value = workout.cadence;
    }
    if (workout.type === 'cycling') {
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
      inputElevation.value = workout.elevation;
    }

    form.addEventListener('submit', this._submitWorkout.bind(this, workout));

    if (editEl) {
      this._showForm();
    }
    inputType.setAttribute('disabled', 'true');
  }
  _submitWorkout(workout, e) {
    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    const id = workout.id;
    const editworkouts = this.#workouts.find(work => work.id === id);
    if (!inputDistance.value) {
      return;
    }
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    if (editworkouts.type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      editworkouts.distance = distance;
      editworkouts.duration = duration;
      editworkouts.cadence = cadence;
      function calcPace(duration, distance) {
        // min/km
        const pace = duration / distance;
        return pace;
      }
      editworkouts.pace = calcPace(duration, distance);
    }
    if (editworkouts.type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      editworkouts.distance = distance;
      editworkouts.duration = duration;
      editworkouts.elevation = elevation;
      function calcSpeed(distance, duration) {
        // km/hr
        const speed = distance / duration / 60;
        return speed;
      }
      editworkouts.speed = calcSpeed(distance, duration);
    }
    localStorage.removeItem('workouts');
    this._setLocalStorage();
    this._resetElement();
    this._updateWorkouts(this.#workouts);
    this._hideForm();
  }
  //Reseting Elements
  _resetElement() {
    const restoredEl = document.querySelectorAll('.workout');
    const restoredPopup = document.querySelectorAll('.leaflet-popup');
    const restoredMarker = document.querySelectorAll('.leaflet-marker-icon');
    const restoredShadow = document.querySelectorAll('.leaflet-marker-shadow');

    restoredEl.forEach(ele => {
      ele.remove();
    });
    restoredPopup.forEach(pop => {
      pop.remove();
    });
    restoredMarker.forEach(marker => {
      marker.remove();
    });
    restoredShadow.forEach(shadow => {
      shadow.remove();
    });
  }
  //Repopulating Workouts
  _updateWorkouts(workout) {
    workout.forEach(workout => {
      this._renderWorkout(workout);
      this._renderWorkoutMarker(workout);
    });
  }

  _removeAll() {
    if (window.confirm('Do you really want to remove all Workouts!')) {
      this._reset();
    }
  }
  //......................................................////////
  _reset() {
    localStorage.removeItem('workouts');
    this._resetElement();
  }
  _sortingOrder() {
    if (!sortDown.classList.contains('hidden')) {
      sortDown.classList.add('hidden');
      sortUp.classList.remove('hidden');
      this._sortWorkout(this, 'ASC');
    } else if (!sortUp.classList.contains('hidden')) {
      sortUp.classList.add('hidden');
      sortDown.classList.remove('hidden');
      this._sortWorkout(this, 'DSC');
    }
  }
  _sortWorkout(e, order = 'DSC') {
    //By Default Sorting Order is Ascending
    if (order === 'DSC') {
      //Showing Up Sorting Descending Button
      if (sortDown.classList.contains('hidden')) {
        sortDown.classList.remove('hidden');
        sortUp.classList.add('hidden');
      }
    }
    const sortBy = sortEl.value;
    if (sortBy === 'distance') {
      this.#workouts.sort((a, b) => {
        if (order === 'DSC') {
          return a.distance - b.distance;
        } else if (order === 'ASC') {
          return b.distance - a.distance;
        }
      });
      this._resetElement();
      this._updateWorkouts(this.#workouts);
    }
    if (sortBy === 'duration') {
      this.#workouts.sort((a, b) => {
        if (order === 'DSC') {
          return a.duration - b.duration;
        } else if (order === 'ASC') {
          return b.duration - a.duration;
        }
      });
      this._resetElement();
      this._updateWorkouts(this.#workouts);
    }
    if (sortBy === 'date') {
      this.#workouts.sort((a, b) => {
        if (order === 'DSC') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (order === 'ASC') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
      });
      this._resetElement();
      this._updateWorkouts(this.#workouts);
    }
  }
}

const app = new App();
