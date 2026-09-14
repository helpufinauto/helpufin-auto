import { supabase } from "../js/api.js";
import { navigate } from "../js/router.js";
import { renderDashboardShell, renderDashboardPageHeading, getActiveListLimit } from "./dashboard.js";
import { toast } from "../js/ui.js";
import {
  validateImageFile,
  optimizeVehicleImage
} from "../js/fileValidation.js";
import {
  getMakes,
  getModels,
  getVariants,
  getBodyTypes,
  getFuelTypes,
  getTransmissionTypes,
  getDriveTypes,
  getColours,
  getConditions,
  getCommercialCategories,
  getFeatures,
  getProvinces,
  getCities,
  getBatteryCapacities,
  getBatteryRanges,
  getChargingTimes,
  getEngineCapacities
} from "../js/catalog.js";
// Vehicle catalogue is now loaded from the database.

/* =========================================================
  🔁 SHARED VEHICLE FORM (CREATE + EDIT)
========================================================= */

let selectedFiles = [];
let existingImages = []; // for edit mode
let isEdit = false;
let editId = null;

let FEATURE_OPTIONS = [];

let selectedFeatures = [];

let activeFeatureCategory = "";

let publishInProgress = false;

/* =========================================
UPLOAD SESSION
========================================= */

function resetUploadSession(){

  /* Release any lingering submission lock so that returning to the
     page (SPA re-entry) always starts from a clean, submittable
     state. This prevents a previous failed/errored submission from
     permanently locking the form after navigation. */
  publishInProgress = false;

  selectedFiles = [];

  existingImages = [];

  selectedFeatures = [];

  FEATURE_OPTIONS = [];

  galleryIndex = 0;

  isEdit = false;

  editId = null;

}

/* =========================================
IMAGE SECURITY
========================================= */

const MAX_IMAGES = 5;

const MAX_FILE_SIZE =
5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
  "image/tiff"
];

// Provinces and cities are now loaded from the shared database catalogue.

export function UploadVehiclePage(){

  resetUploadSession();

  setTimeout(()=>{

    initForm();

  });

  return renderPage(
    "Add Vehicle"
  );

}

export function EditVehiclePage(){
  isEdit = true;
  const params = new URLSearchParams(window.location.search);
  editId = params.get("id");
  setTimeout(()=> initForm());
  return renderPage("Edit Vehicle");
}

/* ================= UI ================= */

function renderPage(title){
  return renderDashboardShell({
    activeNav: "upload",
    mobileTitle: title,
    content: `
  <div class="container-main fade-in hufa-form max-w-6xl mx-auto space-y-8">

    ${renderDashboardPageHeading(title === "Add Vehicle" ? "addvehicle" : "editvehicle")}

<!-- IMAGES -->
<div class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white">

<p class="
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#F28C28]
mb-2
">
Image Manager
</p>

<h2 class="
text-xl
font-black
tracking-[-0.04em]
text-[#08111F]
mb-2
">
Vehicle Images
</h2>

<p class="
text-[#64748B]
mb-6
">
Upload a cover image and additional photos. The first image becomes the primary listing image displayed throughout the marketplace.
</p>

      <div
        id="dropZone"
        class="hufa-dropzone border border-dashed p-8 text-center cursor-pointer rounded-xl transition hover:bg-orange-50/60"
      >

        <div class="text-base font-semibold text-[#08111F]">
          Upload Vehicle Images
        </div>

        <div class="text-sm text-slate-500 mt-1.5">
          Click or drag images here
        </div>

        <div class="text-xs text-slate-400 mt-2">
          Maximum 5 images • JPG • PNG • WEBP
        </div>

        <input
          type="file"
          id="images"
          multiple
          accept="image/*"
          hidden
        >

      </div>

      <div
        id="imageCounter"
        class="text-sm text-slate-500 mt-3"
      >
        0 / 5 Images Selected
      </div>

      <div
        id="imageLimitMessage"
        class="hidden text-sm font-medium text-green-600 mt-3"
      >
        Maximum images reached. Remove or replace an image to continue.
      </div>

      <div
        id="remainingImages"
        class="text-sm text-slate-500 mt-2"
      >
        5 image slots remaining
      </div>

      <div id="preview" class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4"></div>
    </div>

<!-- BASIC INFO -->
<div class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white">

<p class="
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#F28C28]
mb-2
">
Basic Information
</p>

<h2 class="
text-xl
font-black
tracking-[-0.04em]
text-[#08111F]
mb-2
">
Vehicle Details
</h2>

<p class="
text-[#64748B]
mb-6
">
Enter the core information that identifies your vehicle and helps buyers find it through search and filters.
</p>

      <div class="grid md:grid-cols-2 gap-6">

<div class="md:col-span-2">

<label class="block text-sm font-semibold text-slate-700 mb-2">
Search Vehicle
</label>

<div class="relative">

<input
id="vehicleSearch"
type="text"
class="input-light"
placeholder="Search by make, model or variant..."
autocomplete="off"
>

<div
id="vehicleSearchResults"
class="hidden absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto"
></div>

</div>

<p class="text-xs text-slate-500 mt-2">
Start typing to quickly locate a vehicle before selecting its details below.
</p>

</div>

<div class="md:col-span-2">

<label class="block text-sm font-semibold text-slate-700 mb-2">
Vehicle Type
</label>

<select
id="vehicleCategory"
class="input-light"
>
<option value="Passenger Vehicle">
Passenger Vehicle
</option>

<option value="Commercial Vehicle">
Commercial Vehicle
</option>

<option value="Motorcycle">
Motorcycle
</option>

<option value="Quad Bike">
Quad Bike
</option>

<option value="ATV">
ATV
</option>

<option value="Side-by-Side">
Side-by-Side
</option>
</select>

<p class="text-xs text-slate-500 mt-2">
Choose the type of vehicle first. The available makes, models and variants will automatically be filtered.
</p>

</div>

<div>

<label class="block text-sm font-semibold text-slate-700 mb-2">
Make
</label>

<select id="make" class="input-light">
<option value="">Select Make</option>
</select>

<p class="text-xs text-slate-500 mt-2">
Select the manufacturer exactly as shown on the vehicle registration documents.
</p>

</div>

<div>

<label class="block text-sm font-semibold text-slate-700 mb-2">
Model
</label>

<select id="model" class="input-light">
<option value="">Select Model</option>
</select>

<input
id="customModel"
class="input-light hidden mt-3"
placeholder="Enter Model Name"
>

<p class="text-xs text-slate-500 mt-2">
If your exact model is unavailable, choose "Other / Not Listed".
</p>

</div>

<div>

<label class="block text-sm font-semibold text-slate-700 mb-2">
Variant
</label>

<select
id="variant"
class="input-light"
>
<option value="">
Select Variant (Optional)
</option>
</select>

<input
id="customVariant"
class="input-light hidden mt-3"
placeholder="Enter Variant"
>

<p class="text-xs text-slate-500 mt-2">
Selecting the correct variant improves search accuracy and finance estimates.
</p>

</div>

<div>

<label class="block text-sm font-semibold text-slate-700 mb-2">
Condition
</label>

<select
id="condition"
class="input-light"
>
<option value="">
Condition
</option>
</select>

</div>

<div>

<label class="block text-sm font-semibold text-slate-700 mb-2">
Year
</label>

<input
id="year"
placeholder="Year"
class="input-light"
>

<p class="text-xs text-slate-500 mt-2">
Use the model year shown on the registration certificate.
</p>

</div>

<div>

<label class="block text-sm font-semibold text-slate-700 mb-2">
Mileage
</label>

<input
id="mileage"
placeholder="Mileage"
class="input-light"
>

<p class="text-xs text-slate-500 mt-2">
Enter the current odometer reading in kilometres.
</p>

</div>

</div>
    </div>

<!-- SPECIFICATIONS -->
<div class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white">

<p class="
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#F28C28]
mb-2
">
Specifications
</p>

<h2 class="
text-xl
font-black
tracking-[-0.04em]
text-[#08111F]
mb-2
">
Vehicle Specifications
</h2>

<p class="
text-[#64748B]
mb-6
">
Provide the technical specifications of the vehicle to improve search accuracy and finance calculations.
</p>

      <div class="grid md:grid-cols-2 gap-6">
<div id="bodyField">

<select id="body" class="input-light">
  <option value="">Body Type</option>
</select>

<p class="text-xs text-slate-500 mt-2">
Choose the body style that best matches the vehicle.
</p>

</div>

<select id="fuel" class="input-light">
  <option value="">Fuel Type</option>
</select>

<p class="text-xs text-slate-500 mt-2">
Electric and hybrid vehicles will automatically display additional specifications.
</p>

       <div
  id="evFields"
  class="hidden md:col-span-2 grid md:grid-cols-3 gap-6"
>

  <select
    id="batteryCapacity"
    class="input-light"
  >
    <option value="">
      Battery Capacity (kWh)
    </option>
  </select>

  <select
    id="batteryRange"
    class="input-light"
  >
    <option value="">
      Battery Range (km)
    </option>
  </select>

  <select
    id="chargingTime"
    class="input-light"
  >
    <option value="">
      Charging Time (Hours)
    </option>
  </select>

</div>

<div
  id="motorcycleFields"
  class="hidden md:col-span-2 grid md:grid-cols-2 gap-6"
>

<select
  id="motorcycleType"
  class="input-light"
>
  <option value="">
    Motorcycle Type
  </option>

  <option>Sport Bike</option>
  <option>Naked Bike</option>
  <option>Adventure Bike</option>
  <option>Cruiser</option>
  <option>Touring</option>
  <option>Dual Sport</option>
  <option>Off-Road</option>
  <option>Scooter</option>
  <option>Moped</option>
  <option>Motocross</option>
  <option>Enduro</option>
  <option>Supermoto</option>
</select>

<select
  id="engineCapacityCc"
  class="input-light"
>
  <option value="">
    Engine Capacity (cc)
  </option>
</select>

</div>

<select id="trans" class="input-light">
  <option value="">Transmission</option>
</select>
<select id="drive" class="input-light">
  <option value="">Drive</option>
</select>

<select id="color" class="input-light">
  <option value="">Colour</option>
</select>
      </div>
    </div>

<!-- COMMERCIAL SPECIFICATIONS -->

<div
      id="commercialFields"
      class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white hidden"
    >

<p class="
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#F28C28]
mb-2
">
Commercial
</p>

<h2 class="
text-xl
font-black
tracking-[-0.04em]
text-[#08111F]
mb-2
">
Commercial Specifications
</h2>

<p class="
text-[#64748B]
mb-6
">
Complete these fields for commercial vehicles to improve buyer search results and finance accuracy.
</p>
      <div class="grid md:grid-cols-2 gap-6">

        <select
          id="commercialCategory"
          class="input-light"
        >
          <option value="">
            Commercial Category
          </option>
        </select>

       <select
  id="cabConfiguration"
  class="input-light hidden"
>
  <option value="">
    Cab Configuration
  </option>
</select>
       <select
  id="payloadCapacityKg"
  class="input-light"
>

  <option value="">
    Payload Capacity
  </option>

</select>

        <select
          id="towingCapacityKg"
          class="input-light"
        >

          <option value="">
            Towing Capacity
          </option>

          <option value="500">500 kg</option>
          <option value="750">750 kg</option>
          <option value="1000">1 Ton</option>
          <option value="1500">1.5 Tons</option>
          <option value="2000">2 Tons</option>
          <option value="2500">2.5 Tons</option>
          <option value="3000">3 Tons</option>
          <option value="3500">3.5 Tons</option>
          <option value="5000">5 Tons+</option>

        </select>

      </div>

    </div>

<!-- SELLER -->
<div class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white">

<p class="
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#F28C28]
mb-2
">
Seller Information
</p>

<h2 class="
text-xl
font-black
tracking-[-0.04em]
text-[#08111F]
mb-2
">
Seller Details
</h2>

<p class="
text-[#64748B]
mb-6
">
Select the location where this vehicle is available for viewing and collection.
</p>

      <div class="grid md:grid-cols-2 gap-6">
      <input
id="seller"
class="input-light bg-gray-100"
readonly
>

        <select
          id="province"
          class="input-light"
        >
          <option value="">
            Select Province
          </option>
        </select>

        <select
          id="city"
          class="input-light"
        >
          <option value="">
            Select City
          </option>
        </select>

        <input
          id="location"
          type="hidden"
        >
      </div>
    </div>

<!-- EXTRA -->
<div class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white">

<p class="
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#F28C28]
mb-2
">
Vehicle Extras
</p>

<h2 class="
text-xl
font-black
tracking-[-0.04em]
text-[#08111F]
mb-2
">
Features & History
</h2>

<p class="
text-[#64748B]
mb-6
">
Add the equipment, ownership history and verification information that helps buyers compare vehicles.
</p>

      <div class="grid md:grid-cols-2 gap-6">

<div id="doorsField">

<select
  id="doors"
  class="input-light"
>
  <option value="">
    Doors
  </option>
  <option value="2">2 Doors</option>
  <option value="3">3 Doors</option>
  <option value="4">4 Doors</option>
  <option value="5">5 Doors</option>
  <option value="6">6 Doors</option>
</select>

</div>

        <div id="seatsField">

<select
          id="seats"
          class="input-light"
        >
          <option value="">
            Seats
          </option>
          <option value="1">1 Seat</option>
          <option value="2">2 Seats</option>
          <option value="3">3 Seats</option>
          <option value="4">4 Seats</option>
          <option value="5">5 Seats</option>
          <option value="6">6 Seats</option>
          <option value="7">7 Seats</option>
          <option value="8">8 Seats</option>
          <option value="9">9 Seats</option>
          <option value="10">10 Seats</option>
          <option value="11">11 Seats</option>
          <option value="12">12 Seats</option>
          <option value="13">13 Seats</option>
          <option value="14">14 Seats</option>
          <option value="15">15 Seats</option>
          <option value="22">22 Seats</option>
          <option value="30">30 Seats</option>
        </select>

</div>

        <select
          id="owners"
          class="input-light"
        >
          <option value="">
            Previous Owners
          </option>
          <option value="0">0 (New Vehicle)</option>
          <option value="1">1 Previous Owner</option>
          <option value="2">2 Previous Owners</option>
          <option value="3">3 Previous Owners</option>
          <option value="4">4 Previous Owners</option>
          <option value="5">5 Previous Owners</option>
          <option value="6">6 Previous Owners</option>
          <option value="7">7 Previous Owners</option>
          <option value="8">8 Previous Owners</option>
          <option value="9">9 Previous Owners</option>
          <option value="10">10+ Previous Owners</option>
        </select>

<div class="md:col-span-2 border rounded-xl p-4 bg-slate-50">

<input
  id="featureSearch"
  type="text"
  class="input-light mb-3"
  placeholder="Search vehicle features..."
  autocomplete="off"
>

<div
  id="selectedFeatureChips"
  class="hidden flex flex-wrap gap-2 mb-5 pb-4 border-b border-slate-200"
></div>

<div
  id="featureChips"
  class="space-y-4"
></div>

<input
  id="features"
  type="hidden"
>

<div
  class="flex items-center justify-between mt-4"
>

  <div
    class="text-xs text-slate-500"
  >
    Select all features fitted to this vehicle.
  </div>

  <div
    id="featureCount"
    class="text-xs font-medium text-slate-600"
  >
    0 selected
  </div>

</div>
</div>

<div class="md:col-span-2 border-t pt-6">

<h4 class="text-lg font-semibold mb-4">
Vehicle History
</h4>

<div class="grid md:grid-cols-2 gap-6">

<label class="flex items-center gap-2">
<input
type="checkbox"
id="serviceHistory"
>
Full Service History
</label>

<label class="flex items-center gap-2">
<input
type="checkbox"
id="certifiedPreOwned"
>
Certified Pre-Owned
</label>

<label class="flex items-center gap-2">
<input
type="checkbox"
id="accidentFree"
>
Accident Free
</label>

</div>

</div>

<div class="md:col-span-2 border-t pt-6">

<h4 class="text-lg font-semibold mb-4">
Verification & Compliance
</h4>

<div class="grid md:grid-cols-2 gap-6">

<label class="flex items-center gap-2">
<input
type="checkbox"
id="ownershipVerified"
>
Ownership Verified
</label>

<label class="flex items-center gap-2">
<input
type="checkbox"
id="roadworthyCertificate"
>
Roadworthy Certificate
</label>

</div>

<div
class="text-xs text-slate-500 mt-4"
>
These items help buyers verify the history, ownership and legal status of the vehicle.
</div>

</div>




      </div>
    </div>

<!-- PLANS & PROTECTION -->

<div class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white">

<p class="
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#F28C28]
mb-2
">
Protection
</p>

<h2 class="
text-xl
font-black
tracking-[-0.04em]
text-[#08111F]
mb-2
">
Plans & Protection
</h2>

<p class="
text-[#64748B]
mb-6
">
Indicate any active warranties, service plans or maintenance plans included with the vehicle.
</p>

      <div class="grid md:grid-cols-2 gap-6">

        <label class="flex items-center gap-2">
          <input type="checkbox" id="warrantyIncluded">
          Warranty Included
        </label>

        <input
          id="warrantyExpiry"
          type="date"
          class="input-light"
          placeholder="Warranty Expiry"
        >

        <label class="flex items-center gap-2">
          <input type="checkbox" id="servicePlanIncluded">
          Service Plan Included
        </label>

        <input
          id="servicePlanExpiry"
          type="date"
          class="input-light"
          placeholder="Service Plan Expiry"
        >

        <label class="flex items-center gap-2">
          <input type="checkbox" id="maintenancePlanIncluded">
          Maintenance Plan Included
        </label>

        <input
          id="maintenancePlanExpiry"
          type="date"
          class="input-light"
          placeholder="Maintenance Plan Expiry"
        >

        <div
          class="md:col-span-2 text-xs text-slate-500 border-t pt-3"
        >
          Only complete plan expiry dates when the associated plan is included with the vehicle.
        </div>

      </div>
    </div>

<!-- PRICING -->

<div class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white">

<p class="
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#F28C28]
mb-2
">
Pricing
</p>

<h2 class="
text-xl
font-black
tracking-[-0.04em]
text-[#08111F]
mb-2
">
Vehicle Pricing
</h2>

<p class="
text-[#64748B]
mb-6
">
Enter the advertised selling price and choose the finance options available to buyers.
</p>

      <div class="grid md:grid-cols-2 gap-6">

<input
id="price"
type="number"
placeholder="Vehicle Price (Required)"
class="input-light text-lg font-semibold"
>

<p class="text-xs text-slate-500 mt-2">
Enter the total advertised selling price. Do not include spaces or the currency symbol.
</p>
        <div
          class="md:col-span-2 text-xs text-slate-500"
        >
          Enter the advertised selling price of the vehicle in South African Rand.
        </div>

        <label class="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" id="financeAvailable">
          Finance Available
        </label>

        <div
          id="financeFields"
          class="hidden md:col-span-2"
        >

          <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">

            <h4 class="font-semibold text-emerald-900 mb-2">
              Finance Available
            </h4>

            <p class="text-sm text-emerald-700">
              By selecting this option, your vehicle will display an
              <strong>Apply for Finance</strong> button. Buyers will calculate
              repayments using the Helpufin finance calculator based on their
              own deposit, repayment period and credit profile.
            </p>

          </div>

        </div>

        <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">

          <label class="flex items-center gap-2">
            <input type="checkbox" id="vatIncluded">
            VAT Included
          </label>

          <label class="flex items-center gap-2">
            <input type="checkbox" id="priceNegotiable">
            Price Negotiable
          </label>

        </div>

        <div
          class="md:col-span-2 text-xs text-slate-500 border-t pt-3"
        >
          Finance calculations are optional and only displayed when finance is available.
        </div>

      </div>
    </div>

<!-- DESCRIPTION -->

<div class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white">

<p class="
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#F28C28]
mb-2
">
Description
</p>

<h2 class="
text-xl
font-black
tracking-[-0.04em]
text-[#08111F]
mb-2
">
Vehicle Description
</h2>

<p class="
text-[#64748B]
mb-6
">
Provide buyers with a detailed overview of the vehicle's condition, history and notable features.
</p>

<textarea
id="description"
rows="8"
maxlength="5000"
class="input-light w-full"
placeholder="Describe the vehicle's condition, service history, accident history, extras, modifications, finance options or anything a buyer should know."
></textarea>

<p class="text-xs text-slate-500 mt-2">
Include important information such as optional extras, recent maintenance, modifications, remaining plans or warranties, and any known defects.
</p>

<div class="flex justify-between mt-2">

  <p class="text-xs text-slate-500">
    A detailed description helps buyers make informed decisions.
  </p>

  <span
    id="descriptionCounter"
    class="text-xs text-slate-500"
  >
    0 / 5000
  </span>

</div>

    </div>

<!-- IMPORTANT DISCLOSURES -->

<div class="card p-8 mb-8 border border-slate-200 rounded-2xl shadow-sm bg-white">

<p class="
uppercase
tracking-[0.18em]
text-[12px]
font-black
text-[#F28C28]
mb-2
">
Declaration
</p>

<h2 class="
text-xl
font-black
tracking-[-0.04em]
text-[#08111F]
mb-2
">
Seller Declaration
</h2>

<p class="
text-[#64748B]
mb-6
">
Please confirm that the information and images provided accurately represent the vehicle being advertised.
</p>
      <div class="space-y-4">

        <label class="flex items-start gap-3">

          <input
            id="confirmOwnership"
            type="checkbox"
            class="mt-1"
          >

          <span class="text-sm text-slate-700">
            I confirm that I am authorised to advertise and sell this vehicle.
          </span>

        </label>

        <label class="flex items-start gap-3">

          <input
            id="confirmAccuracy"
            type="checkbox"
            class="mt-1"
          >

          <span class="text-sm text-slate-700">
            I confirm that all information provided is accurate to the best of my knowledge.
          </span>

        </label>

        <label class="flex items-start gap-3">

          <input
            id="confirmImages"
            type="checkbox"
            class="mt-1"
          >

          <span class="text-sm text-slate-700">
            I confirm that the uploaded images accurately represent this vehicle.
          </span>

        </label>

        <div class="border-t pt-4">

          <p class="text-xs text-slate-500 leading-6">
            By publishing this listing you acknowledge that HUFA may moderate, edit,
            reject or remove listings that violate marketplace policies, contain false
            information, duplicate listings, misleading pricing or prohibited content.
          </p>

        </div>

      </div>

    </div>

    <button
id="submitBtn"
class="hufa-submit w-full px-6 py-3 rounded-xl bg-[#E48A2F] text-[#08111F] font-bold tracking-wide shadow-sm transition-all duration-300 hover:bg-[#08111F] hover:text-white hover:shadow-md active:scale-[0.98] text-base"
>
      ${isEdit ? "Save Changes" : "Publish Vehicle"}
    </button>

<div
id="publishOverlay"
class="hufa-publish-overlay hidden"
role="alertdialog"
aria-live="assertive"
aria-busy="true"
>

<div
class="hufa-publish-backdrop"
></div>

<div
class="hufa-publish-center"
>

<div
class="hufa-publish-card bg-white"
>

<div
id="publishSpinner"
class="hufa-publish-spinner"
></div>

<p
class="hufa-publish-brand"
>HUFA</p>

<h2
id="publishTitle"
class="hufa-publish-title"
>
Adding Your Vehicle
</h2>

<p
class="hufa-publish-subtitle"
>We're securely processing your vehicle listing. Please keep this window open.</p>

<ul
id="publishStages"
class="hufa-publish-stages"
>

<li data-stage="1">
<span class="hufa-stage-dot"></span>
<span>Preparing vehicle details</span>
</li>

<li data-stage="2">
<span class="hufa-stage-dot"></span>
<span>Uploading vehicle images</span>
</li>

<li data-stage="3">
<span class="hufa-stage-dot"></span>
<span>Saving vehicle listing</span>
</li>

<li data-stage="4">
<span class="hufa-stage-dot"></span>
<span id="publishStageFourLabel">Publishing vehicle</span>
</li>

<li data-stage="5">
<span class="hufa-stage-dot"></span>
<span>Finalising</span>
</li>

</ul>

<div
class="hufa-publish-bar"
>

<div
id="publishProgressBar"
class="hufa-publish-bar-fill"
></div>

</div>

<div
id="publishStep"
class="hufa-publish-step"
>
Step 1 of 5
</div>

<p
id="publishStatus"
class="hufa-publish-status"
>
Preparing vehicle information...
</p>

<p
class="hufa-publish-note"
>Please keep this window open. Do not close or refresh the page.</p>

</div>

</div>

</div>

  </div>
    `
  });
}

/* ================= INIT ================= */

async function initForm(){

if(!isEdit){

  resetUploadSession();

  document
    .querySelector("form")
    ?.reset();

}

await fillMakes();

resetModels();

await fillProvinces();

await fillBodyTypes();

await fillFuelTypes();

await fillTransmissionTypes();

await fillDriveTypes();

await fillBatteryCapacities();

await fillBatteryRanges();

await fillChargingTimes();

await fillEngineCapacities();

await fillColours();
await fillConditions();

await fillCommercialCategories();

initImageUpload();

FEATURE_OPTIONS =
await getFeatures();

document
.getElementById(
  "featureSearch"
)
?.addEventListener(
  "input",
  renderFeatureChips
);

const vehicleSearch =
document.getElementById(
  "vehicleSearch"
);

const vehicleSearchResults =
document.getElementById(
  "vehicleSearchResults"
);

if(vehicleSearch){

  vehicleSearch.addEventListener(
    "input",
    handleVehicleSearch
  );

  vehicleSearch.addEventListener(
    "focus",
    handleVehicleSearch
  );

  vehicleSearch.addEventListener(
    "keydown",
    e=>{

      if(e.key === "Escape"){

        vehicleSearch.value = "";

        vehicleSearchResults
          ?.classList.add(
            "hidden"
          );

        vehicleSearchResults.innerHTML = "";

      }

    }
  );

  document.addEventListener(
    "click",
    e=>{

      if(
        !vehicleSearch.contains(e.target) &&
        !vehicleSearchResults?.contains(e.target)
      ){

        vehicleSearchResults
          ?.classList.add(
            "hidden"
          );

      }

    }
  );

}

await renderFeatureChips();
  document
    .getElementById("fuel")
    ?.addEventListener(
      "change",
      toggleEVFields
    );

  toggleEVFields();

toggleMotorcycleFields();

  document
    .getElementById("make")
    .addEventListener(
      "change",
      async ()=>{

        await fillModels();

        resetVariants();

        await fillVariants();

      }
    );

document
  .getElementById("model")
  .addEventListener(
    "change",
    async ()=>{

      toggleCustomModel();

      resetVariants();

      await fillVariants();

    }
  );

document
  .getElementById("variant")
  ?.addEventListener(
    "change",
    toggleCustomVariant
  );

document
  .getElementById("condition")
  ?.addEventListener(
    "change",
    toggleMileageField
  );

toggleMileageField();

document
  .getElementById("financeAvailable")
  ?.addEventListener(
    "change",
    toggleFinanceFields
  );

toggleFinanceFields();

initDescriptionCounter();

document
  .getElementById("vehicleCategory")
  ?.addEventListener(
    "change",
    async ()=>{

await fillMakes();

toggleVehicleCategory();

await fillCommercialCategories();

valSet("commercialCategory", "");
valSet("cabConfiguration", "");
valSet("payloadCapacityKg", "");
valSet("towingCapacityKg", "");

updateCabConfigurations();

    }
  );

document
  .getElementById("commercialCategory")
  ?.addEventListener(
    "change",
    updateCabConfigurations
  );

document
  .getElementById("cabConfiguration")
  ?.addEventListener(
    "change",
    updateCabConfigurations
  );

[
  [
    "warrantyIncluded",
    "warrantyExpiry"
  ],
  [
    "servicePlanIncluded",
    "servicePlanExpiry"
  ],
  [
    "maintenancePlanIncluded",
    "maintenancePlanExpiry"
  ]
].forEach(([checkboxId,inputId])=>{

  const checkbox =
    document.getElementById(checkboxId);

  const input =
    document.getElementById(inputId);

  if(!checkbox || !input) return;

  const sync = ()=>{

    input.disabled = !checkbox.checked;

    if(!checkbox.checked){

      input.value = "";

    }

  };

  checkbox.addEventListener(
    "change",
    sync
  );

  sync();

});

toggleVehicleCategory();

toggleMotorcycleFields();

updateCabConfigurations();

toggleCustomModel();

const { data:userData } =
await supabase.auth.getUser();

if(!userData.user){

  navigate("/login");
  return;

}

/* =====================================
UPLOAD LIMIT REMOVED
===================================== */

/*
Unlimited vehicle uploads enabled.
Package restrictions disabled.
*/

const sellerProfile =
await supabase
.from("profiles")
.select("account_type")
.eq("id", userData.user.id)
.single();

if(
  sellerProfile?.data?.account_type
){

  valSet(
    "seller",
    sellerProfile.data.account_type
  );

}

if(isEdit && editId){
  await loadVehicle(editId);
}

  document.getElementById("submitBtn").onclick = submitVehicle;
}

/* ================= LOAD (EDIT MODE) ================= */

async function loadVehicle(id){

  const { data:userData } =
  await supabase.auth.getUser();

  if(!userData?.user){
    toast("Login required");
    navigate("/login");
    return;
  }

  const user = userData.user;

  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .eq("seller_id", user.id)
    .single();

  if(error || !data){
    toast("Unauthorized vehicle access");
    navigate("/dashboard");
    return;
  }

  valSet("make", data.make);
  valSet("model", data.model);

  valSet(
    "variant",
    data.variant
  );

  valSet("year", data.year);
  valSet("price", data.price);
  valSet("mileage", data.mileage);

  valSet("body", data.body_type);
  valSet("fuel", data.fuel_type);

  valSet(
    "batteryCapacity",
    data.battery_capacity_kwh
  );

  valSet(
    "batteryRange",
    data.battery_range_km
  );

  valSet(
    "chargingTime",
    data.charging_time_hours
  );

toggleEVFields();

valSet(
  "motorcycleType",
  data.motorcycle_type
);

valSet(
  "engineCapacityCc",
  data.engine_capacity_cc
);

toggleMotorcycleFields();

valSet("trans", data.transmission);
  valSet("drive", data.drive_type);

  valSet("seller", data.seller_type);
  valSet("condition", data.condition);

  valSet("color", data.color);
  valSet("location", data.location);

  valSet("doors", data.doors);
  valSet("seats", data.seats);
  valSet("owners", data.owners);

if (
  Array.isArray(data.features) &&
  data.features.length
) {

  selectedFeatures =
  [...data.features];

  document.getElementById(
    "features"
  ).value =
  JSON.stringify(
    selectedFeatures
  );

  renderFeatureChips();

}

  valSet(
    "description",
    data.description
  );

  initDescriptionCounter();

  document.getElementById("serviceHistory").checked =
    data.service_history || false;

document.getElementById("ownershipVerified").checked =
  data.ownership_verified || false;

document.getElementById("accidentFree").checked =
  data.accident_free || false;

document.getElementById("roadworthyCertificate").checked =
  data.roadworthy_certificate || false;

document.getElementById("certifiedPreOwned").checked =
  data.certified_pre_owned || false;


valSet(
  "vehicleCategory",
  data.vehicle_category ||
  (
    data.commercial_vehicle
      ? "Commercial Vehicle"
      : "Passenger Vehicle"
  )
);

valSet(
  "commercialCategory",
  data.commercial_category
);

valSet(
  "cabConfiguration",
  data.cab_configuration
);

valSet(
  "payloadCapacityKg",
  data.payload_capacity_kg
);

valSet(
  "towingCapacityKg",
  data.towing_capacity_kg
);

toggleVehicleCategory();

  document.getElementById("warrantyIncluded").checked =
    data.warranty_included || false;

  valSet(
    "warrantyExpiry",
    data.warranty_expiry_date
  );

  document.getElementById("servicePlanIncluded").checked =
    data.service_plan_included || false;

  valSet(
    "servicePlanExpiry",
    data.service_plan_expiry_date
  );

  document.getElementById("maintenancePlanIncluded").checked =
    data.maintenance_plan_included || false;

  valSet(
    "maintenancePlanExpiry",
    data.maintenance_plan_expiry_date
  );

  valSet("price", data.price);

  /*
  Monthly repayment, deposit amount and balloon payment
  are calculated by the Helpufin finance engine and are
  no longer entered by sellers.
  */

  document.getElementById("financeAvailable").checked =
    data.finance_available || false;

  toggleFinanceFields();

  document.getElementById("vatIncluded").checked =
    data.vat_included || false;

  document.getElementById("priceNegotiable").checked =
    data.price_negotiable || false;

  /*
  Featured listings removed.
  */

  existingImages = data.images || (data.image_url ? [data.image_url] : []);
  renderExistingImages();

  await fillModels();

  valSet(
    "model",
    data.model
  );

  toggleCustomModel();

  await fillVariants();

  valSet(
    "variant",
    data.variant
  );

  toggleCustomVariant();
}

/* ================= SUBMIT ================= */

async function submitVehicle(){

if(publishInProgress){

  return;

}

/* SINGLE-SUBMISSION LOCK — set IMMEDIATELY before any await so that
   rapid/duplicate clicks (or any re-entrant invocation while the
   first is still mid-flight) cannot pass the guard above and start a
   second vehicle creation. Without this, the window between the guard
   check and the first await (supabase.auth.getUser) is exploitable:
   a second click during that await sees publishInProgress === false
   and proceeds to a second INSERT. */
publishInProgress = true;

  const { data:userData } = await supabase.auth.getUser();
  const user = userData.user;

const make =
val("make")
.trim()
.slice(0,50);

const model =
val("model") === "__OTHER_MODEL__"
  ? val("customModel")
      .trim()
      .replace(/\s+/g," ")
      .slice(0,50)
  : val("model")
      .trim()
      .slice(0,50);
  const price = parseFloat(val("price"));

if(!make){

  failField("make", "Please select a vehicle make");
  return;

}

if(!model){

  failField(
    model === "" && !val("customModel") ? "model" : "customModel",
    "Please select a vehicle model"
  );
  return;

}

if(

  ![
    "Motorcycle",
    "Quad Bike",
    "ATV",
    "Side-by-Side"
  ].includes(
    val("vehicleCategory")
  ) &&

  !val("body")

){

  failField("body", "Please select a body type");
  return;

}

if(!val("fuel")){

  failField("fuel", "Please select a fuel type");
  return;

}

if(!val("trans")){

  failField("trans", "Please select a transmission");
  return;

}

if(!val("province")){

  failField("province", "Please select a province");
  return;

}

if(!val("city")){

  failField("city", "Please select a city");
  return;

}

if(!price || price <= 0){

  failField("price", "Enter a valid vehicle price");
  return;

}

if(price > 50000000){

  failField("price", "Vehicle price appears too high");
  return;

}

const year = parseInt(val("year"));

if(!year){

  failField("year", "Please enter a vehicle year");
  return;

}

if(
  year < 1980 ||
  year > new Date().getFullYear()
){

  failField("year", "Enter a valid year");
  return;

}

const mileage = parseInt(val("mileage"));

if(
  val("condition") !== "new" &&
  !mileage
){

  failField("mileage", "Please enter mileage");
  return;

}

if(
  mileage &&
  mileage < 0
){

  failField("mileage", "Mileage cannot be negative");
  return;

}

if(
  mileage > 2000000
){

  failField("mileage", "Mileage appears too high");
  return;

}

const owners = parseInt(val("owners"));

if(
  owners &&
  owners < 0
){
  failField("owners", "Owners cannot be negative");
  return;
}

if(
  owners > 20
){
  failField("owners", "Owners value appears too high");
  return;
}

if(
  val("fuel") === "Electric" &&
  !val("batteryCapacity")
){
  failField(
    "batteryCapacity",
    "Battery capacity is required for electric vehicles"
  );
  return;
}

if(
  val("fuel") === "Electric" &&
  !val("batteryRange")
){
  failField(
    "batteryRange",
    "Battery range is required for electric vehicles"
  );
  return;
}

if(
  [
    "Motorcycle",
    "Quad Bike",
    "ATV",
    "Side-by-Side"
    ].includes(
      val("vehicleCategory")
    ) &&
  !val("motorcycleType")
){
  failField("motorcycleType", "Please select a vehicle type");
  return;
}

if(
  val("vehicleCategory") === "Commercial Vehicle"
){

  if(!val("commercialCategory")){

    failField("commercialCategory", "Please select a commercial category");
    return;

  }

  const cabRequired = [
    "Utility Vehicle",
    "Chassis Cab",
    "Light Truck",
    "Medium Truck",
    "Heavy Truck"
  ];

  if(
    cabRequired.includes(
      val("commercialCategory")
    ) &&
    !val("cabConfiguration")
  ){

    failField("cabConfiguration", "Please select a cab configuration");
    return;

  }

  if(!val("payloadCapacityKg")){

    failField("payloadCapacityKg", "Please select a payload capacity");
    return;

  }

  const towingRequired = ![
    "Panel Van",
    "Cargo Van",
    "Bus",
    "Minibus"
  ].includes(
    val("commercialCategory")
  );

  if(
    towingRequired &&
    !val("towingCapacityKg")
  ){

    failField("towingCapacityKg", "Please select a towing capacity");
    return;

  }

}

if(
  [
    "Motorcycle",
    "Quad Bike",
    "ATV",
    "Side-by-Side"
    ].includes(
      val("vehicleCategory")
    )
){

  const cc =
    parseInt(
      val("engineCapacityCc")
    );

  if(!cc){
    failField("engineCapacityCc", "Please enter engine capacity");
    return;
  }

  if(cc < 50 || cc > 3000){
    failField("engineCapacityCc", "Engine capacity appears invalid");
    return;
  }

}

if(
  document.getElementById("warrantyIncluded").checked &&
  !val("warrantyExpiry")
){
  failField("warrantyExpiry", "Please enter the warranty expiry date.");
  return;
}

if(
  document.getElementById("servicePlanIncluded").checked &&
  !val("servicePlanExpiry")
){
  failField("servicePlanExpiry", "Please enter the service plan expiry date.");
  return;
}

if(
  document.getElementById("maintenancePlanIncluded").checked &&
  !val("maintenancePlanExpiry")
){
  failField("maintenancePlanExpiry", "Please enter the maintenance plan expiry date.");
  return;
}

if(
  !document.getElementById("confirmOwnership").checked
){
  failField("confirmOwnership", "Please confirm that you are authorised to sell this vehicle.");
  return;
}

if(
  !document.getElementById("confirmAccuracy").checked
){
  failField("confirmAccuracy", "Please confirm that the vehicle information is accurate.");
  return;
}

if(
  !document.getElementById("confirmImages").checked
){
  failField("confirmImages", "Please confirm that the uploaded images represent this vehicle.");
  return;
}

let urls = [...existingImages];

/* PHASE 7A — image-count validation runs BEFORE the upload
   overlay appears so a failed validation never flashes the
   processing screen at the user. */

if(
  !urls.length &&
  !selectedFiles.length
){

  failField("dropZone", "Please upload at least one vehicle image");

  return;

}

if(
  selectedFiles.length +
  urls.length >
  MAX_IMAGES
){

  failField("dropZone", `Maximum ${MAX_IMAGES} images allowed`);

  return;

}

/* =====================================
LAUNCH PROMOTION — ACTIVE LISTING LIMIT
===================================== */
if(
  !isEdit
){

  /* Only a brand-new upload (not an edit) consumes an active
     listing slot, so the limit is enforced here rather than
     on updates. Reuses the shared package-limit helper from
     ./dashboard.js — no parallel limit system. */

  const activeLimit =
  await getActiveListLimit();

  if(
    activeLimit !== Infinity
  ){

    const { count } =
    await supabase
      .from("vehicles")
      .select("*",{
        count:"exact",
        head:true
      })
      .eq("seller_id", user.id)
      .or(
        "status.eq.active,status.is.null"
      );

    if(
      (count || 0) >=
      activeLimit
    ){

      /* Release the submission lock — this is a validation-style
         rejection, not a failure mid-creation. The user must be
         able to adjust their listings and retry. */
      publishInProgress = false;

      toast(
        `Your package allows up to ${activeLimit} active listings. Please deactivate or remove a listing before adding another.`
      );

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth"
      });

      return;

    }

  }

}

/* The single-submission lock is already set at the top of
   submitVehicle() — before any await — so it is NOT repeated here. */

/* PHASE 6 — hard-disable the submit control for the entire
   upload so rapid/duplicate clicks can never fire a second
   submission (belt-and-braces with the publishInProgress guard). */

setSubmitDisabled(true);

window.scrollTo({
  top: 0,
  left: 0,
  behavior: "instant"
});

showPublishOverlay(
  isEdit
    ? "Updating Your Vehicle"
    : "Adding Your Vehicle",
  "Preparing vehicle details"
);

updatePublishStatus(
  1,
  "Preparing vehicle details"
);

/* PHASE 7A — paint boundary. Give the browser two animation
   frames to actually paint the full-screen overlay BEFORE any
   expensive asynchronous/upload work begins. This guarantees:

   Click Publish -> Overlay visibly painted -> Upload starts.

   (A single rAF only schedules a callback before the next
   paint; nesting it twice guarantees at least one completed
   frame with the overlay on screen.) No artificial delays. */

await new Promise(resolve =>
  requestAnimationFrame(() =>
    requestAnimationFrame(resolve)
  )
);

updatePublishStatus(
  2,
  "Uploading vehicle images"
);

  for(let f of selectedFiles){

    /* PHASE 1 — final guard before Supabase
       Storage: reject ZIPs and non-image files. */

    const guard =
    await validateImageFile(
      f,
      {
        maxSize: MAX_FILE_SIZE,
        allowedTypes: ALLOWED_IMAGE_TYPES
      }
    );

    if(!guard.ok){

      publishInProgress = false;

      hidePublishOverlay();

      toast(guard.error);

      return;

    }

    /* PERFORMANCE 
-
   Optimize the image IN THE BROWSER before it reaches Storage:
   oversized photos are downscaled (longest edge 1600px) and
   re-encoded as WebP (JPEG fallback). Fail-safe: if optimization
   is not possible or not smaller, the ORIGINAL file is uploaded.
   Same bucket, same upload call, same URL pattern. */

    const optimized =
    await optimizeVehicleImage(f);

    if(optimized){

      f = optimized;

    }

const safeName =
f.name
.replace(/[^a-zA-Z0-9.\-_]/g, "_");

const name =
`${Date.now()}_${crypto.randomUUID()}_${safeName}`;

    const { error: uploadError } =
await supabase.storage.from("vehicle-images").upload(name, f);

if(uploadError){

  console.error(
    "UPLOAD FAILURE:",
    uploadError
  );

  publishInProgress = false;

  hidePublishOverlay();

  toast(
    "Image upload failed"
  );

  return;

}

    const { data } = supabase.storage
      .from("vehicle-images")
      .getPublicUrl(name);

    urls.push(data.publicUrl);
  }

const variant =
val("variant") === "__OTHER__"
  ? val("customVariant")
      .trim()
      .replace(/\s+/g," ")
      .slice(0,120)
  : val("variant")
      .trim();

let catalogRequestNeeded =
false;

let requestType =
null;

if(
  val("model") === "__OTHER_MODEL__" &&
  model
){

  catalogRequestNeeded =
  true;

  requestType =
  "new_model";

}
else if(
  val("variant") === "__OTHER__" &&
  variant
){

  catalogRequestNeeded =
  true;

  requestType =
  "new_variant";

}

/*
Vehicle description is optional.
Users may enter any amount of text or leave it blank.
*/

updatePublishStatus(
  3,
  "Saving vehicle information..."
);

const payload = {

    title: `${make} ${model}`,

    make,
    model,

    variant:
      variant,

    year: parseInt(val("year")) || null,

    price,

    mileage:
      parseInt(val("mileage")) || null,

    body_type: val("body"),

    fuel_type: val("fuel"),

    transmission: val("trans"),

    drive_type: val("drive"),

seller_type: val("seller"),

vehicle_category:
  val("vehicleCategory"),

condition: val("condition"),

    color:
      val("color")
      .trim()
      .replace(/\s+/g," ")
      .slice(0,40),

    province:
      val("province")
      .trim()
      .slice(0,60),

    city:
      val("city")
      .trim()
      .slice(0,80),

    location:
      val("location")
      .trim()
      .slice(0,120),

    doors:
      parseInt(val("doors")) || null,

    seats:
      parseInt(val("seats")) || null,

    owners:
      parseInt(val("owners")) || null,

features:
  [...new Set(
    selectedFeatures
  )],

description:
  val("description")
    .trim()
    .replace(/\s+/g," ")
    .slice(0,5000),

    

    service_history:
      document.getElementById("serviceHistory").checked,

   ownership_verified:
  document.getElementById("ownershipVerified").checked,

accident_free:
  document.getElementById("accidentFree").checked,

roadworthy_certificate:
  document.getElementById("roadworthyCertificate").checked,

certified_pre_owned:
  document.getElementById("certifiedPreOwned").checked,

verified_dealer: false,

franchise_dealer: false,

independent_dealer: false,

premium_dealer: false,

commercial_vehicle:
  val("vehicleCategory") === "Commercial Vehicle",

commercial_category:
  val("commercialCategory"),

cab_configuration:
  val("cabConfiguration"),

payload_capacity_kg:
  parseInt(
    val("payloadCapacityKg")
  ) || null,

towing_capacity_kg:
  parseInt(
    val("towingCapacityKg")
  ) || null,
    warranty_included:
      document.getElementById("warrantyIncluded").checked,

    warranty_expiry_date:
      document.getElementById("warrantyIncluded").checked
        ? val("warrantyExpiry") || null
        : null,

    service_plan_included:
      document.getElementById("servicePlanIncluded").checked,

    service_plan_expiry_date:
      document.getElementById("servicePlanIncluded").checked
        ? val("servicePlanExpiry") || null
        : null,

    maintenance_plan_included:
      document.getElementById("maintenancePlanIncluded").checked,

    maintenance_plan_expiry_date:
      document.getElementById("maintenancePlanIncluded").checked
        ? val("maintenancePlanExpiry") || null
        : null,

    price:
      Number(val("price")) || null,

    monthly_repayment: null,

    deposit_amount: null,

    balloon_payment: null,

    finance_available:
      document.getElementById("financeAvailable").checked,

    vat_included:
      document.getElementById("vatIncluded").checked,

    price_negotiable:
      document.getElementById("priceNegotiable").checked,

    is_featured: false,

    image_url:
      urls[0] || null,

    images:
      urls,

    is_electric:
      val("fuel") === "Electric",

    is_hybrid:
      val("fuel") === "Hybrid",

    is_plugin_hybrid:
      val("fuel") === "Plug-In Hybrid",

motorcycle_type:
      [
        "Motorcycle",
        "Quad Bike",
        "ATV",
        "Side-by-Side"
      ].includes(
        val("vehicleCategory")
      )
        ? val("motorcycleType")
        : null,

engine_capacity_cc:
      [
        "Motorcycle",
        "Quad Bike",
        "ATV",
        "Side-by-Side"
      ].includes(
        val("vehicleCategory")
      )
        ? parseInt(
            val("engineCapacityCc")
          ) || null
        : null,

    battery_capacity_kwh:
      parseFloat(
        val("batteryCapacity")
      ) || null,

    battery_range_km:
      parseInt(
        val("batteryRange")
      ) || null,

    charging_time_hours:
      parseFloat(
        val("chargingTime")
      ) || null,

    seller_id:
      user.id

};
  let error;

updatePublishStatus(
  4,
  isEdit
    ? "Updating your listing..."
    : "Publishing your vehicle..."
);

if(isEdit){
  ({ error } = await supabase
    .from("vehicles")
    .update(payload)
    .eq("id", editId));
} else {
  ({ error } = await supabase
    .from("vehicles")
    .insert(payload));
}

if(error){

  console.error("UPLOAD ERROR:", error);

  publishInProgress = false;

  showPublishFailure(
    error.message || "An unexpected error occurred while saving your vehicle."
  );

  setTimeout(()=>{

    hidePublishOverlay();

    toast("Vehicle could not be uploaded. Please try again.");

  },2500);

  return;

}

if(
  catalogRequestNeeded &&
  !isEdit
){

  const {
    data: createdVehicle
  } =
  await supabase
    .from("vehicles")
    .select("id")
    .eq(
      "seller_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending:false
      }
    )
    .limit(1)
    .single();

  await supabase
    .from(
      "vehicle_catalog_requests"
    )
    .insert({

      user_id:
        user.id,

      vehicle_id:
        createdVehicle?.id || null,

      make,

      model,

      variant:
  requestType === "new_model"
    ? "Base"
    : variant,

request_type:
  requestType,

      status:
        "pending"

    });

}

updatePublishStatus(
  5,
  "Finalising..."
);

showPublishSuccess(

  isEdit
    ? "Your vehicle has been updated in your inventory."
    : "Your vehicle has been added to your inventory."

);

setTimeout(()=>{

  publishInProgress = false;

  hidePublishOverlay();

  toast(
    isEdit
      ? "Vehicle updated"
      : "Vehicle uploaded"
  );

  /* PHASE 3 — post-upload destination is DASHBOARD → INVENTORY.
     Seed the dashboard's persisted view as "inventory" so
     DashboardPage boots straight into the Inventory view
     (same page reached via Dashboard sidebar → Inventory),
     which reloads inventory data on mount — so the newly
     uploaded vehicle appears. Never navigate to My Vehicles. */
  try{
    sessionStorage.setItem("dashboardView", "inventory");
  }catch(err){}

  navigate("/dashboard/dealer");

},1800);
}

/* ================= IMAGES ================= */

function initImageUpload(){

  const drop =
  document.getElementById(
    "dropZone"
  );

  const input =
  document.getElementById(
    "images"
  );

  input.value = "";

  renderPreview();

  drop.onclick =
  ()=> input.click();

  input.onchange =
  e => handleFiles(
    e.target.files
  );

}

async function handleFiles(files){

  const incoming =
  Array.from(files || []);

  for(const f of incoming){

    /* =========================
    MAX IMAGE LIMIT
    ========================= */

    if(
      selectedFiles.length +
      existingImages.length
      >=
      MAX_IMAGES
    ){

      toast(
        `Maximum ${MAX_IMAGES} images allowed`
      );

      break;
    }

    /* =========================
    MIME VALIDATION
    ========================= */

    if(
      !ALLOWED_IMAGE_TYPES.includes(
        f.type
      )
    ){

      toast(
        `${f.name} is not a supported image`
      );

      continue;
    }

    /* =========================
    PHASE 1 — CONTENT VALIDATION
    Validates the ACTUAL file content, not just
    the browser-reported MIME type. Rejects ZIPs
    renamed to .jpg/.png, documents, executables
    and other non-image files.
    ========================= */

    const validation =
    await validateImageFile(
      f,
      {
        maxSize: MAX_FILE_SIZE,
        allowedTypes: ALLOWED_IMAGE_TYPES
      }
    );

    if(!validation.ok){

      toast(validation.error);

      continue;
    }

    /* =========================
    FILE SIZE VALIDATION
    ========================= */

    if(
      f.size > MAX_FILE_SIZE
    ){

      toast(
        `${f.name} exceeds 5MB limit`
      );

      continue;
    }

    /* =========================
    DUPLICATE DETECTION
    ========================= */

    const duplicate =
    selectedFiles.some(existing =>
      existing.name === f.name &&
      existing.size === f.size
    );

    if(duplicate){

      toast(
        `${f.name} already added`
      );

      continue;
    }

    selectedFiles.push(f);

  }

  renderPreview();

}

function renderPreview(){

  const box =
  document.getElementById(
    "preview"
  );

  box.innerHTML = "";

  if(
    !existingImages.length &&
    !selectedFiles.length
  ){

    box.innerHTML = `
      <div class="hufa-empty-images col-span-full text-center text-slate-400 py-8 rounded-xl border border-dashed border-slate-200">
        No images uploaded yet
      </div>
    `;

  }

  const counter =
  document.getElementById(
    "imageCounter"
  );

  if(counter){

    counter.textContent =
      `${
        existingImages.length +
        selectedFiles.length
      } / ${MAX_IMAGES} Images Selected`;

  }

  const dropZone =
  document.getElementById(
    "dropZone"
  );

  const totalImages =
    existingImages.length +
    selectedFiles.length;

  const limitMessage =
  document.getElementById(
    "imageLimitMessage"
  );

  const remainingImages =
  document.getElementById(
    "remainingImages"
  );

  if(
    remainingImages
  ){

    remainingImages.textContent =
    `${
      MAX_IMAGES - totalImages
    } image slots remaining`;

  }

  if(dropZone){

    if(
      totalImages >= MAX_IMAGES
    ){

      dropZone.classList.add(
        "hidden"
      );

      limitMessage
        ?.classList.remove(
          "hidden"
        );

    }else{

      dropZone.classList.remove(
        "hidden"
      );

      limitMessage
        ?.classList.add(
          "hidden"
        );

    }

  }

 existingImages.forEach((url,i)=>{

  box.innerHTML += `
    <div class="hufa-image-slot border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">

      <img
        src="${url}"
        loading="lazy"
        class="w-full h-40 object-cover cursor-pointer"
        onclick="openGallery(${i})"
      >

      <div class="grid grid-cols-2 gap-2 p-2.5 bg-white border-t border-slate-100">

        <button
          type="button"
          class="btn btn-clean btn-sm !py-1.5"
          onclick="replaceExisting(${i})"
        >
          Replace
        </button>

        <button
          type="button"
          class="btn btn-sm !py-1.5 text-red-600 bg-white border border-red-200 hover:bg-red-50"
          onclick="removeExisting(${i})"
        >
          Remove
        </button>

      </div>

    </div>
  `;

});

selectedFiles.forEach((f,i)=>{

  const url =
  URL.createObjectURL(f);

  box.innerHTML += `
    <div class="hufa-image-slot border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">

      <img
        src="${url}"
        loading="lazy"
        class="w-full h-40 object-cover cursor-pointer"
        onclick="openGallery(${existingImages.length + i})"
      >

      <div class="grid grid-cols-2 gap-2 p-2.5 bg-white border-t border-slate-100">

        <button
          type="button"
          class="btn btn-clean btn-sm !py-1.5"
          onclick="replaceNew(${i})"
        >
          Replace
        </button>

        <button
          type="button"
          class="btn btn-sm !py-1.5 text-red-600 bg-white border border-red-200 hover:bg-red-50"
          onclick="removeNew(${i})"
        >
          Remove
        </button>

      </div>

    </div>
  `;

});
}

function renderExistingImages(){
  renderPreview();
}

window.removeExisting = i=>{

  const confirmed =
  confirm(
    "Remove this image?"
  );

  if(!confirmed) return;

  existingImages.splice(i,1);

  renderPreview();

};

window.removeNew = i=>{

  const confirmed =
  confirm(
    "Remove this image?"
  );

  if(!confirmed) return;

  selectedFiles.splice(i,1);

  renderPreview();

};

window.replaceNew = i=>{

  const input =
  document.createElement("input");

  input.type = "file";

  input.accept =
  "image/*";

  input.onchange = async e=>{

    const file =
    e.target.files?.[0];

    if(!file) return;

    /* PHASE 1 — validate actual content
       before accepting the replacement. */

    const validation =
    await validateImageFile(
      file,
      {
        maxSize: MAX_FILE_SIZE,
        allowedTypes: ALLOWED_IMAGE_TYPES
      }
    );

    if(!validation.ok){

      toast(validation.error);

      return;

    }

    selectedFiles[i] = file;

    renderPreview();

  };

  input.click();

};

window.replaceExisting = i=>{

  const input =
  document.createElement("input");

  input.type = "file";

  input.accept =
  "image/*";

  input.onchange = async e=>{

    const file =
    e.target.files?.[0];

    if(!file) return;

    /* PHASE 1 — validate actual content
       before accepting the replacement. */

    const validation =
    await validateImageFile(
      file,
      {
        maxSize: MAX_FILE_SIZE,
        allowedTypes: ALLOWED_IMAGE_TYPES
      }
    );

    if(!validation.ok){

      toast(validation.error);

      return;

    }

    existingImages.splice(i,1);

    selectedFiles.push(file);

    renderPreview();

  };

  input.click();

};

/* ================= MAKE + MODEL ================= */

async function fillMakes(){

  const list =
  document.getElementById("make");

  if(!list) return;

  list.innerHTML = `
    <option value="">
      Select Make
    </option>
  `;

  const vehicleCategory =
    val("vehicleCategory");

  const makes =
    await getMakes(vehicleCategory);

  makes.forEach(make=>{

    const option =
      document.createElement("option");

    option.value = make;

    option.textContent = make;

    list.appendChild(option);

  });

}

function resetModels(){

  const list =
  document.getElementById(
    "model"
  );

  if(!list) return;

  list.innerHTML = `
    <option value="">
      Select Model
    </option>
  `;

}

function resetVariants(){

  const list =
  document.getElementById(
    "variant"
  );

  if(!list) return;

  list.innerHTML = `
    <option value="">
      Select Variant (Optional)
    </option>
  `;

  const custom =
  document.getElementById(
    "customVariant"
  );

  if(custom){

    custom.value = "";

    custom.classList.add(
      "hidden"
    );

  }

}

async function fillModels(){

  const make =
  document.getElementById(
    "make"
  ).value;

  const list =
  document.getElementById(
    "model"
  );

  resetModels();

  if(!make) return;

const vehicleCategory =
  val("vehicleCategory");

const models =
await getModels(
  make,
  vehicleCategory
);

  models.forEach(m=>{

    const option =
    document.createElement(
      "option"
    );

    option.value = m;

    option.textContent = m;

    list.appendChild(
      option
    );

  });

  const otherOption =
  document.createElement(
    "option"
  );

  otherOption.value =
  "__OTHER_MODEL__";

  otherOption.textContent =
  "Other / Not Listed";

  list.appendChild(
    otherOption
  );

}

async function fillVariants(){

  const make =
  val("make").trim();

  const model =
  val("model").trim();

  resetVariants();

  if(!make || !model){
    return;
  }

  if(model === "__OTHER_MODEL__"){
    return;
  }

const vehicleCategory =
  val("vehicleCategory");

const variants =
await getVariants(
  make,
  model,
  vehicleCategory
);
  const list =
  document.getElementById(
    "variant"
  );

  variants.forEach(variant=>{

    const option =
    document.createElement(
      "option"
    );

    option.value =
    variant;

    option.textContent =
    variant;

    list.appendChild(
      option
    );

  });

  const otherOption =
  document.createElement(
    "option"
  );

  otherOption.value =
  "__OTHER__";

  otherOption.textContent =
  "Other / Not Listed";

  list.appendChild(
    otherOption
  );

}

function toggleCustomModel(){

  const model =
  val("model");

  const custom =
  document.getElementById(
    "customModel"
  );

  if(!custom) return;

  if(
    model === "__OTHER_MODEL__"
  ){

    custom.classList.remove(
      "hidden"
    );

  }else{

    custom.classList.add(
      "hidden"
    );

    custom.value = "";

  }

}

function toggleCustomVariant(){

  const variant =
  val("variant");

  const custom =
  document.getElementById(
    "customVariant"
  );

  if(!custom) return;

  if(
    variant === "__OTHER__"
  ){

    custom.classList.remove(
      "hidden"
    );

  }else{

    custom.classList.add(
      "hidden"
    );

    custom.value = "";

  }

}

function toggleEVFields(){

  const fuel =
  val("fuel");

  const box =
  document.getElementById(
    "evFields"
  );

  if(!box) return;

  if(
    fuel === "Electric" ||
    fuel === "Hybrid" ||
    fuel === "Plug-In Hybrid"
  ){

    box.classList.remove(
      "hidden"
    );

  }else{

    box.classList.add(
      "hidden"
    );

    valSet(
      "batteryCapacity",
      ""
    );

    valSet(
      "batteryRange",
      ""
    );

    valSet(
      "chargingTime",
      ""
    );

  }

}

function toggleMotorcycleFields(){

  const category =
    val("vehicleCategory");

  const section =
    document.getElementById("motorcycleFields");

  const body =
    document.getElementById("body");

  const bodyField =
    document.getElementById("bodyField");

  const doorsField =
    document.getElementById("doorsField");

  const seatsField =
    document.getElementById("seatsField");

  const motorcycleCategories = [
    "Motorcycle",
    "ATV",
    "Quad Bike",
    "Side-by-Side"
  ];

  const showMotorcycleFields =
    motorcycleCategories.includes(category);

  if(section){

    section.classList.toggle(
      "hidden",
      !showMotorcycleFields
    );

  }

  if(bodyField){

    bodyField.classList.toggle(
      "hidden",
      showMotorcycleFields
    );

  }

  if(doorsField){

    doorsField.classList.toggle(
      "hidden",
      showMotorcycleFields
    );

  }

  if(seatsField){

    seatsField.classList.toggle(
      "hidden",
      showMotorcycleFields
    );

  }

  if(body && showMotorcycleFields){

    body.value = "";

  }

  if(showMotorcycleFields){

    valSet("doors","");
    valSet("seats","");

  }

  if(!showMotorcycleFields){

    valSet(
      "motorcycleType",
      ""
    );

    valSet(
      "engineCapacityCc",
      ""
    );

  }

}

function toggleMileageField(){

  const condition =
  val("condition");

  const mileage =
  document.getElementById(
    "mileage"
  );

  if(!mileage) return;

  if(condition === "new"){

    mileage.value = "0";

    mileage.disabled = true;

    mileage.placeholder =
    "New Vehicle";

  }else{

    mileage.disabled = false;

    if(
      mileage.value === "0"
    ){
      mileage.value = "";
    }

    mileage.placeholder =
    "Mileage";

  }

}

function initDescriptionCounter(){

  const textarea =
  document.getElementById(
    "description"
  );

  const counter =
  document.getElementById(
    "descriptionCounter"
  );

  if(
    !textarea ||
    !counter
  ) return;

  const update = ()=>{

    counter.textContent =
      `${textarea.value.length} / 5000`;

  };

  textarea.addEventListener(
    "input",
    update
  );

  update();

}

function toggleFinanceFields(){

  const enabled =
  document.getElementById(
    "financeAvailable"
  )?.checked;

  const box =
  document.getElementById(
    "financeFields"
  );

  if(!box) return;

  if(enabled){

    box.classList.remove(
      "hidden"
    );

  }else{

    box.classList.add(
      "hidden"
    );

    /*
    Seller finance values removed.
    Helpufin calculates finance automatically.
    */

  }

}

function toggleVehicleCategory(){

  const category =
    val("vehicleCategory");

  const commercial =
    document.getElementById("commercialFields");

  const ev =
    document.getElementById("evFields");

  const motorcycleCategories = [
    "Motorcycle",
    "ATV",
    "Quad Bike",
    "Side-by-Side"
  ];

  const isMotorcycleCategory =
    motorcycleCategories.includes(category);

  if(commercial){

    commercial.classList.toggle(
      "hidden",
      category !== "Commercial Vehicle"
    );

  }

  if(category !== "Commercial Vehicle"){

    valSet("commercialCategory","");
    valSet("cabConfiguration","");
    valSet("payloadCapacityKg","");
    valSet("towingCapacityKg","");

  }

  if(!isMotorcycleCategory){

    valSet("motorcycleType","");
    valSet("engineCapacityCc","");

  }

  toggleMotorcycleFields();

  /* Reset catalogue selections whenever the vehicle category changes */

  valSet("make","");

  resetModels();

  resetVariants();

  toggleCustomModel();

  toggleCustomVariant();

  /* Reload catalogue for the selected vehicle type */

  fillMakes();

  if(ev){

    toggleEVFields();

  }

}

async function fillProvinces(){

  const province =
  document.getElementById(
    "province"
  );

  if(!province) return;

  province.innerHTML =
  `<option value="">
    Select Province
  </option>`;

const provinces =
await getProvinces();

console.log("HUFA Provinces:", provinces);
  provinces.forEach(name=>{

    const option =
    document.createElement(
      "option"
    );

    option.value = name;

    option.textContent = name;

    province.appendChild(option);

  });

  province.addEventListener(
    "change",
    async ()=>{

      await fillCities();

      updateLocation();

    }
  );

}

async function fillCities(){

  const province =
  val("province");

  const city =
  document.getElementById(
    "city"
  );

  if(!city) return;

  city.innerHTML =
  `<option value="">
    Select City
  </option>`;

  if(!province){
    return;
  }

  const cities =
  await getCities(
    province
  );

  cities.forEach(name=>{

    const option =
    document.createElement(
      "option"
    );

    option.value = name;

    option.textContent =
    name;

    city.appendChild(
      option
    );

  });

  city.onchange =
  updateLocation;

}

/* ================= HELPERS ================= */

async function handleVehicleSearch(){

  const input =
    document.getElementById(
      "vehicleSearch"
    );

  const results =
    document.getElementById(
      "vehicleSearchResults"
    );

  if(
    !input ||
    !results
  ){
    return;
  }

  const search =
    input.value
      .trim()
      .toLowerCase();

  if(search.length < 2){

    results.innerHTML = "";

    results.classList.add(
      "hidden"
    );

    return;

  }

  const vehicleCategory =
    val("vehicleCategory");

  const makes =
    await getMakes(
      vehicleCategory
    );

  const matches = [];

  for(const make of makes){

    if(
      make
      .toLowerCase()
      .includes(search)
    ){

      matches.push({

        make,

        model: "",

        variant: ""

      });

    }

    const models =
      await getModels(
        make,
        vehicleCategory
      );

    for(const model of models){

      if(
        model
        .toLowerCase()
        .includes(search)
      ){

        matches.push({

          make,

          model,

          variant: ""

        });

      }

      const variants =
        await getVariants(
          make,
          model,
          vehicleCategory
        );

      variants.forEach(
        variant=>{

          if(

            variant
            .toLowerCase()
            .includes(search)

          ){

            matches.push({

              make,

              model,

              variant

            });

          }

        }

      );

    }

  }

  console.log(
    "Vehicle Search Matches",
    matches
  );

  results.innerHTML = "";

  if(!matches.length){

    results.innerHTML = `
      <div class="px-4 py-3 text-sm text-slate-500">
        No matching vehicles found.
      </div>
    `;

    results.classList.remove(
      "hidden"
    );

    return;

  }

  matches
    .slice(0,25)
    .forEach(item=>{

      const row =
        document.createElement("button");

      row.type = "button";

      row.className =
        "w-full text-left px-4 py-3 hover:bg-slate-100 border-b border-slate-100 transition";

      let title =
        item.make;

      if(item.model){

        title +=
          ` ${item.model}`;

      }

      if(item.variant){

        title +=
          ` ${item.variant}`;

      }

      row.innerHTML = `

        <div class="font-medium text-slate-800">
          ${title}
        </div>

        <div class="text-xs text-slate-500 mt-1">
          ${item.make}
          ${item.model ? "• " + item.model : ""}
          ${item.variant ? "• " + item.variant : ""}
        </div>

      `;

      row.dataset.make =
        item.make;

      row.dataset.model =
        item.model;

      row.dataset.variant =
        item.variant;

      row.onclick = async ()=>{

        results.classList.add(
          "hidden"
        );

        input.value = [
          item.make,
          item.model,
          item.variant
        ]
        .filter(Boolean)
        .join(" ");

        results.innerHTML = "";

        valSet(
          "make",
          item.make
        );

        await fillModels();

        valSet(
          "model",
          item.model
        );

        await fillVariants();

        valSet(
          "variant",
          item.variant
        );

        toggleCustomModel();

        toggleCustomVariant();

      };

      results.appendChild(
        row
      );

    });

  results.classList.remove(
    "hidden"
  );

}

let galleryIndex = 0;

window.openGallery = index=>{

  galleryIndex = index;

  const images = [
    ...existingImages,
    ...selectedFiles.map(
      f=>URL.createObjectURL(f)
    )
  ];

  const overlay =
  document.createElement("div");

  overlay.id =
  "galleryOverlay";

  overlay.className =
  "fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-8";

  overlay.innerHTML = `
    <button
      id="galleryClose"
      class="absolute top-4 right-4 px-6 py-3 rounded-none bg-white text-[#08111F] font-semibold tracking-[0.01em] border-0 border-r-[2.5px] border-b-[2.5px] border-r-[#163A70] border-b-[#163A70] shadow-none transition-all duration-200 hover:text-[#163A70] hover:border-r-[#F28C28] hover:border-b-[#F28C28]"
    >
      Close
    </button>

    <button
      id="galleryPrev"
      class="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white text-[#08111F] text-2xl font-semibold border-0 border-r-[2.5px] border-b-[2.5px] border-r-[#163A70] border-b-[#163A70] transition-all duration-200 hover:text-[#163A70] hover:border-r-[#F28C28] hover:border-b-[#F28C28]"
    >
      ‹
    </button>

    <div class="flex flex-col items-center gap-4">

      <img
        id="galleryImage"
        src="${images[galleryIndex]}"
        class="max-h-[75vh] max-w-[75vw] object-contain rounded-lg"
      >

    </div>

    <button
      id="galleryNext"
      class="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white text-[#08111F] text-2xl font-semibold border-0 border-r-[2.5px] border-b-[2.5px] border-r-[#163A70] border-b-[#163A70] transition-all duration-200 hover:text-[#163A70] hover:border-r-[#F28C28] hover:border-b-[#F28C28]"
    >
      ›
    </button>
  `;

  document.body.appendChild(
    overlay
  );

  const image =
  document.getElementById(
    "galleryImage"
  );

  const updateGallery = ()=>{

    image.src =
    images[galleryIndex];

  };

  document.getElementById(
    "galleryPrev"
  ).onclick = e=>{

    e.preventDefault();

    e.stopPropagation();

    galleryIndex =
      galleryIndex <= 0
      ? images.length - 1
      : galleryIndex - 1;

    updateGallery();

  };

  document.getElementById(
    "galleryNext"
  ).onclick = e=>{

    e.preventDefault();

    e.stopPropagation();

    galleryIndex =
      galleryIndex >= images.length - 1
      ? 0
      : galleryIndex + 1;

    updateGallery();

  };

  window.onkeydown = e=>{

    if(
      !document.getElementById(
        "galleryOverlay"
      )
    ) return;

    if(
      e.key === "ArrowLeft"
    ){

      e.preventDefault();

      galleryIndex =
        galleryIndex <= 0
        ? images.length - 1
        : galleryIndex - 1;

      updateGallery();

    }

    if(
      e.key === "ArrowRight"
    ){

      e.preventDefault();

      galleryIndex =
        galleryIndex >= images.length - 1
        ? 0
        : galleryIndex + 1;

      updateGallery();

    }

    if(
      e.key === "Escape"
    ){

      e.preventDefault();

      overlay.remove();

      window.onkeydown =
      null;

    }

  };

  document.getElementById(
    "galleryClose"
  ).onclick = ()=>{

    overlay.remove();

    window.onkeydown =
    null;

  };

  overlay.onclick = e=>{

    if(
      e.target === overlay
    ){

      overlay.remove();

      window.onkeydown =
      null;

    }

  };

};

function renderFeatureChips(){

  const container =
  document.getElementById(
    "featureChips"
  );

  if(!container) return;

  container.innerHTML = "";

const selectedContainer =
document.getElementById(
  "selectedFeatureChips"
);

if(selectedContainer){

  selectedContainer.innerHTML = "";

  if(selectedFeatures.length){

    selectedContainer.classList.remove(
      "hidden"
    );

    selectedFeatures
      .slice()
      .sort()
      .forEach(feature=>{

        const chip =
        document.createElement(
          "button"
        );

        chip.type =
        "button";

        chip.className =
"hufa-chip-selected inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#005BBF] text-white text-xs font-semibold shadow-sm hover:bg-[#004FA8] transition";

        chip.innerHTML =
        `
          <span>${feature}</span>
          <span class="text-base leading-none">&times;</span>
        `;

        chip.onclick = ()=>{

          selectedFeatures =
          selectedFeatures.filter(
            item=>item!==feature
          );

          document.getElementById(
            "features"
          ).value =
          JSON.stringify(
            selectedFeatures
          );

          const countElement =
          document.getElementById(
            "featureCount"
          );

          if(countElement){

            countElement.textContent =
            `${selectedFeatures.length} selected`;

          }

          renderFeatureChips();

        };

        selectedContainer.appendChild(
          chip
        );

      });

  }else{

    selectedContainer.classList.add(
      "hidden"
    );

  }

}

const searchTerm =
document
.getElementById(
  "featureSearch"
)
?.value
.toLowerCase()
.trim() || "";

const groups = {};

FEATURE_OPTIONS.forEach(feature=>{

    const category =
      feature.parent ||
      "Other";

    if(!groups[category]){

      groups[category] = [];

    }

    groups[category].push(feature);

  });

const categories =
Object.keys(groups);

/* PHASE 8 — mobile only: arrange the feature category tabs in
   alphabetical (A→Z) display order. The sort is gated to ≤767.98px
   so the desktop/tablet tab strip keeps its existing order. */
if(
  (window.matchMedia &&
    window.matchMedia(
      "(max-width: 767.98px)"
    ).matches)
){
  categories.sort(
    (a,b)=>a.localeCompare(b)
  );
}

if(
  !activeFeatureCategory ||
  !groups[activeFeatureCategory]
){

  activeFeatureCategory =
  categories[0];

}

const navigation =
document.createElement("div");

/* PHASE 1 UI FIX — feature category selector:
   - each tab is shrink-0 so labels can never be compressed or clipped
     (the .hufa-form * { min-width:0 } rule previously let flex shrink
     squeeze the button text);
   - clean intentional horizontal scroller (hidden scrollbar + edge
     fade handled via .hufa-feature-nav styles);
   - active tab is scrolled fully into view after render so a partially
     clipped category is never the resting state. */
navigation.className =
"hufa-feature-nav w-full flex overflow-x-auto gap-2 pb-3 mb-5 border-b border-slate-200";

navigation.setAttribute("role", "tablist");

categories.forEach(category=>{

  const tab =
  document.createElement("button");

  tab.type = "button";

  const isActive =
  category === activeFeatureCategory;

  tab.className =
  isActive
  ? "hufa-tab-active hufa-feature-tab shrink-0 whitespace-nowrap px-5 py-2 rounded-full bg-[#005BBF] text-white text-sm font-semibold shadow-sm ring-2 ring-[#E48A2F]/60"
  : "hufa-tab hufa-feature-tab shrink-0 whitespace-nowrap px-5 py-2 rounded-full border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:border-[#E48A2F] hover:text-[#08111F] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E48A2F]/60";

  tab.textContent =
  category;

  if(isActive){
    tab.setAttribute("aria-selected", "true");
  }

  tab.onclick = ()=>{

    activeFeatureCategory =
    category;

    renderFeatureChips();

  };

  navigation.appendChild(tab);

});

/* keep the active category completely visible — never rest on a
   half-clipped tab.
   NOTE: this must scroll ONLY the tab strip itself. The original
   scrollIntoView() call also scrolled every vertical ancestor,
   including the window, which yanked the page down to the Features
   section on initial load. Scrolling the .hufa-feature-nav element
   itself centers the active tab with zero effect on page scroll. */
requestAnimationFrame(()=>{

  const activeTab =
  navigation.querySelector(".hufa-tab-active");

  if(activeTab && typeof navigation.scrollTo === "function"){

    try{
      navigation.scrollTo({
        left: Math.max(
          0,
          activeTab.offsetLeft -
          (navigation.clientWidth - activeTab.offsetWidth) / 2
        ),
        behavior: "smooth"
      });
    }catch(e){
      try{ navigation.scrollLeft = activeTab.offsetLeft; }catch(_){ /* no-op */ }
    }

  }

});

const navigationWrapper =
document.createElement("div");

navigationWrapper.className =
"w-full";

navigationWrapper.appendChild(
  navigation
);

container.appendChild(
  navigationWrapper
);

const categoriesToRender =
searchTerm
  ? categories
  : [activeFeatureCategory];

categoriesToRender.forEach(category=>{

  const matchingFeatures =
  groups[category].filter(feature=>{

    if(!searchTerm){

      return true;

    }

    return feature.value
      .toLowerCase()
      .includes(searchTerm);

  });

  if(
    searchTerm &&
    !matchingFeatures.length
  ){
    return;
  }

  const wrapper =
  document.createElement("div");

  wrapper.className =
  "w-full";

  if(searchTerm){

    const heading =
    document.createElement("h4");

    heading.className =
    "text-sm font-semibold text-slate-600 mb-3";

    heading.textContent =
    category;

    wrapper.appendChild(
      heading
    );

  }

  const grid =
  document.createElement("div");

  grid.className =
  "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3";

  matchingFeatures.forEach(feature=>{

    const featureName =
    feature.value;

    const selected =
    selectedFeatures.includes(
      featureName
    );

    const button =
    document.createElement(
      "button"
    );

    button.type = "button";

    button.className =
      selected
      ? "hufa-feature-selected w-full px-4 py-2.5 rounded-lg bg-[#E48A2F] text-[#08111F] text-sm font-semibold text-center transition hover:bg-[#d97e22]"
      : "hufa-feature w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium text-center transition hover:border-[#E48A2F] hover:text-[#08111F] hover:bg-orange-50/50";

    button.textContent =
    featureName;

    button.onclick = ()=>{

      if(selected){

        selectedFeatures =
        selectedFeatures.filter(
          item=>item!==featureName
        );

      }else{

        selectedFeatures.push(
          featureName
        );

      }

      selectedFeatures =
      [...new Set(
        selectedFeatures
      )];

      document.getElementById(
        "features"
      ).value =
      JSON.stringify(
        selectedFeatures
      );

      const countElement =
      document.getElementById(
        "featureCount"
      );

      if(countElement){

        countElement.textContent =
        `${selectedFeatures.length} selected`;

      }

      renderFeatureChips();

    };

    grid.appendChild(
      button
    );

  });

  wrapper.appendChild(
    grid
  );

  container.appendChild(
    wrapper
  );

});

if(
  searchTerm &&
  !container.querySelector("button")
){

  const empty =
  document.createElement("div");

  empty.className =
  "py-10 text-center text-slate-400";

  empty.textContent =
  "No matching features found.";

  container.appendChild(
    empty
  );

}

}

async function fillBodyTypes(){

  const select =
  document.getElementById(
    "body"
  );

  if(!select) return;

  select.innerHTML =
  `<option value="">
    Body Type
  </option>`;

  const bodyTypes =
  await getBodyTypes();

  bodyTypes.forEach(type=>{

    const option =
    document.createElement(
      "option"
    );

    option.value = type;
    option.textContent = type;

    select.appendChild(option);

  });

}

async function fillFuelTypes(){

  const select =
  document.getElementById("fuel");

  if(!select) return;

  select.innerHTML =
  `<option value="">Fuel Type</option>`;

  const items =
  await getFuelTypes();

  items.forEach(item=>{

    const option =
    document.createElement("option");

    option.value = item;
    option.textContent = item;

    select.appendChild(option);

  });

}

async function fillTransmissionTypes(){

  const select =
  document.getElementById("trans");

  if(!select) return;

  select.innerHTML =
  `<option value="">Transmission</option>`;

  const items =
  await getTransmissionTypes();

  items.forEach(item=>{

    const option =
    document.createElement("option");

    option.value = item;
    option.textContent = item;

    select.appendChild(option);

  });

}

async function fillDriveTypes(){

  const select =
  document.getElementById("drive");

  if(!select) return;

  select.innerHTML =
  `<option value="">Drive</option>`;

  const items =
  await getDriveTypes();

  items.forEach(item=>{

    const option =
    document.createElement("option");

    option.value = item;
    option.textContent = item;

    select.appendChild(option);

  });

}

async function fillBatteryCapacities(){

  const select =
  document.getElementById(
    "batteryCapacity"
  );

  if(!select) return;

  select.innerHTML =
  `<option value="">
    Battery Capacity (kWh)
  </option>`;

  const items =
  await getBatteryCapacities();

  items.forEach(item=>{

    const option =
    document.createElement("option");

    option.value = item;

    option.textContent = item;

    select.appendChild(option);

  });

}

async function fillBatteryRanges(){

  const select =
  document.getElementById(
    "batteryRange"
  );

  if(!select) return;

  select.innerHTML =
  `<option value="">
    Battery Range (km)
  </option>`;

  const items =
  await getBatteryRanges();

  items.forEach(item=>{

    const option =
    document.createElement("option");

    option.value = item;

    option.textContent = item;

    select.appendChild(option);

  });

}

async function fillChargingTimes(){

  const select =
  document.getElementById(
    "chargingTime"
  );

  if(!select) return;

  select.innerHTML =
  `<option value="">
    Charging Time (Hours)
  </option>`;

  const items =
  await getChargingTimes();

  items.forEach(item=>{

    const option =
    document.createElement("option");

    option.value = item;

    option.textContent = item;

    select.appendChild(option);

  });

}

async function fillEngineCapacities(){

  const select =
  document.getElementById(
    "engineCapacityCc"
  );

  if(!select) return;

  select.innerHTML =
  `<option value="">
    Engine Capacity (cc)
  </option>`;

  const items =
  await getEngineCapacities();

  items.forEach(item=>{

    const option =
    document.createElement("option");

    option.value =
      parseInt(item);

    option.textContent =
      item;

    select.appendChild(option);

  });

}

async function fillColours(){

  const select =
  document.getElementById("color");

  if(!select) return;

  select.innerHTML =
  `<option value="">Colour</option>`;

  const items =
  await getColours();

  items.forEach(item=>{

    const option =
    document.createElement("option");

    option.value = item;
    option.textContent = item;

    select.appendChild(option);

  });

}

async function fillConditions(){

  const select =
  document.getElementById("condition");

  if(!select) return;

  select.innerHTML =
  `<option value="">Condition</option>`;

  const items =
    (await getConditions())
      .filter(item =>
        item &&
        item.toLowerCase() !== "used"
      );

  items.forEach(item=>{

    const option =
    document.createElement("option");

    option.value = item;
    option.textContent = item;

    select.appendChild(option);

  });

}

async function fillCommercialCategories(){

  const select =
  document.getElementById(
    "commercialCategory"
  );

  if(!select) return;

  select.innerHTML =
  `<option value="">
    Commercial Category
  </option>`;

const items =
(await getCommercialCategories()).filter(
  item => ![
    "Single Cab",
    "Space Cab",
    "Extended Cab",
    "Double Cab",
    "Crew Cab",
    "Chassis Cab"
  ].includes(item)
);

items.forEach(item=>{

  const option =
  document.createElement(
    "option"
  );

  option.value = item;
  option.textContent = item;

  select.appendChild(option);

});
}

function updateCabConfigurations(){

const category =
  val("commercialCategory");

const payloadSelect =
document.getElementById(
  "payloadCapacityKg"
);

const towingSelect =
document.getElementById(
  "towingCapacityKg"
);

const cabSelect =
document.getElementById(
  "cabConfiguration"
);

  if(
    !cabSelect ||
    !payloadSelect ||
    !towingSelect
  ) return;

const pickupCategories = [
  "Utility Vehicle"
];

const truckCategories = [
  "Chassis Cab",
  "Light Truck",
  "Medium Truck",
  "Heavy Truck",
  "Tipper",
  "Dropside",
  "Flatbed",
  "Refrigerated Truck",
  "Horse & Livestock",
  "Tow Truck"
];

const vanCategories = [
  "Panel Van",
  "Cargo Van",
  "Minibus",
  "Bus"
];

const noTowingCategories = [
  "Panel Van",
  "Cargo Van",
  "Bus",
  "Minibus"
];

let cabOptions = [];

switch(category){

  case "Utility Vehicle":

    cabOptions = [
      "Single Cab",
      "Space Cab",
      "Extended Cab",
      "Extra Cab",
      "King Cab",
      "Club Cab",
      "Double Cab"
    ];

    break;

  case "Chassis Cab":

    cabOptions = [
      "Day Cab",
      "Crew Cab"
    ];

    break;

  case "Light Truck":
  case "Medium Truck":
  case "Heavy Truck":

    cabOptions = [
      "Day Cab",
      "Sleeper Cab",
      "Crew Cab"
    ];

    break;

  default:

    cabOptions = [];

}

const previousCab =
cabSelect.value;

cabSelect.innerHTML =
'<option value="">Cab Configuration</option>';

cabOptions.forEach(item=>{

  const option =
  document.createElement("option");

  option.value = item;

  option.textContent = item;

  cabSelect.appendChild(option);

});

if(
  previousCab &&
  cabOptions.includes(previousCab)
){

  cabSelect.value =
  previousCab;

}

cabSelect.classList.toggle(
  "hidden",
  cabOptions.length === 0
);

cabSelect.onchange = ()=>{

  updatePayloadOptions(
    category,
    cabSelect.value
  );

  updateTowingOptions(
    category,
    cabSelect.value
  );

};

updatePayloadOptions(
  category,
  cabSelect.value
);

updateTowingOptions(
  category,
  cabSelect.value
);

payloadSelect.classList.toggle(
  "hidden",
  false
);

towingSelect.classList.toggle(
  "hidden",
  noTowingCategories.includes(category)
);

if(cabOptions.length === 0){

  cabSelect.value = "";

}

if(vanCategories.includes(category)){

  payloadSelect.value = "";

}

if(
  !(
    pickupCategories.includes(category) ||
    truckCategories.includes(category)
  )
){

  towingSelect.value = "";

}

}

function updatePayloadOptions(category, cab = ""){

  const select =
  document.getElementById(
    "payloadCapacityKg"
  );

  if(!select) return;

  let values = [];

  console.log("Payload Category:", category);
console.log("Payload Cab:", cab);

if(category === "Utility Vehicle"){

  switch(cab){

    case "Single Cab":

      values = [
        ["750","750 kg"],
        ["1000","1 Ton"],
        ["1200","1.2 Tons"],
        ["1500","1.5 Tons"]
      ];

      break;

    case "Space Cab":
    case "Extended Cab":
    case "Extra Cab":
    case "King Cab":
    case "Club Cab":

      values = [
        ["500","Up to 500 kg"],
        ["750","750 kg"],
        ["1000","1 Ton"],
        ["1200","1.2 Tons"]
      ];

      break;

    case "Double Cab":

      values = [
        ["500","Up to 500 kg"],
        ["750","750 kg"],
        ["1000","1 Ton"]
      ];

      break;

    default:

      values = [
        ["500","Up to 500 kg"],
        ["750","750 kg"],
        ["1000","1 Ton"],
        ["1200","1.2 Tons"],
        ["1500","1.5 Tons"]
      ];

  }

  }else if(
    [
      "Chassis Cab",
      "Light Truck",
      "Medium Truck"
    ].includes(category)
  ){

    values = [
      ["1500","1.5 Tons"],
      ["2000","2 Tons"],
      ["2500","2.5 Tons"],
      ["3000","3 Tons"],
      ["3500","3.5 Tons"]
    ];

  }else if(
    [
      "Refrigerated Truck"
    ].includes(category)
  ){

    values = [
      ["1000","1 Ton"],
      ["1500","1.5 Tons"],
      ["2000","2 Tons"],
      ["2500","2.5 Tons"],
      ["3000","3 Tons"],
      ["3500","3.5 Tons"],
      ["5000","5 Tons"],
      ["7500","7.5 Tons"],
      ["10000","10 Tons"],
      ["15000","15 Tons"],
      ["20000","20 Tons"],
      ["30000","30 Tons+"]
    ];

  }else if(
    [
      "Heavy Truck",
      "Tipper",
      "Dropside",
      "Flatbed",
      "Tow Truck",
      "Horse & Livestock"
    ].includes(category)
  ){

    values = [
      ["3000","3 Tons"],
      ["3500","3.5 Tons"],
      ["5000","5 Tons"],
      ["7500","7.5 Tons"],
      ["10000","10 Tons"],
      ["15000","15 Tons"],
      ["20000","20 Tons"],
      ["30000","30 Tons+"]
    ];

  }else if(category === "Panel Van"){

    values = [
      ["500","Up to 500 kg"],
      ["750","750 kg"],
      ["1000","1 Ton"],
      ["1500","1.5 Tons"],
      ["2000","2 Tons"]
    ];

  }else if(category === "Cargo Van"){

    values = [
      ["750","750 kg"],
      ["1000","1 Ton"],
      ["1500","1.5 Tons"],
      ["2000","2 Tons"],
      ["2500","2.5 Tons"]
    ];

  }else if(category === "Bus"){

    values = [
      ["500","Up to 500 kg"],
      ["750","750 kg"],
      ["1000","1 Ton"],
      ["1500","1.5 Tons"]
    ];

  }else if(category === "Minibus"){

    values = [
      ["500","Up to 500 kg"],
      ["750","750 kg"],
      ["1000","1 Ton"]
    ];

  }else{

    values = [];

  }

  select.innerHTML =
    '<option value="">Payload Capacity</option>';

  values.forEach(([value,label])=>{

    const option =
    document.createElement("option");

    option.value = value;

    option.textContent = label;

    select.appendChild(option);

  });

}

function updateTowingOptions(category, cab = ""){

  const select =
  document.getElementById(
    "towingCapacityKg"
  );

  if(!select) return;

  let values = [];

if(category === "Utility Vehicle"){

  switch(cab){

    case "Single Cab":

      values = [
        ["1500","1.5 Tons"],
        ["2000","2 Tons"],
        ["2500","2.5 Tons"],
        ["3000","3 Tons"],
        ["3500","3.5 Tons"]
      ];

      break;

    case "Space Cab":
    case "Extended Cab":
    case "Extra Cab":
    case "King Cab":
    case "Club Cab":

      values = [
        ["1000","1 Ton"],
        ["1500","1.5 Tons"],
        ["2000","2 Tons"],
        ["2500","2.5 Tons"],
        ["3000","3 Tons"],
        ["3500","3.5 Tons"]
      ];

      break;

    case "Double Cab":

      values = [
        ["750","750 kg"],
        ["1000","1 Ton"],
        ["1500","1.5 Tons"],
        ["2000","2 Tons"],
        ["2500","2.5 Tons"],
        ["3000","3 Tons"]
      ];

      break;

    default:

      values = [
        ["750","750 kg"],
        ["1000","1 Ton"],
        ["1500","1.5 Tons"],
        ["2000","2 Tons"],
        ["2500","2.5 Tons"],
        ["3000","3 Tons"],
        ["3500","3.5 Tons"]
      ];

  }

  }else if(
    [
      "Light Truck",
      "Medium Truck"
    ].includes(category)
  ){

    values = [
      ["1000","1 Ton"],
      ["1500","1.5 Tons"],
      ["2000","2 Tons"],
      ["2500","2.5 Tons"],
      ["3000","3 Tons"]
    ];

  }else if(
    [
      "Heavy Truck",
      "Tipper",
      "Dropside",
      "Flatbed",
      "Refrigerated Truck",
      "Tow Truck",
      "Horse & Livestock"
    ].includes(category)
  ){

    values = [
      ["3000","3 Tons"],
      ["3500","3.5 Tons"],
      ["5000","5 Tons"],
      ["7500","7.5 Tons"],
      ["10000","10 Tons"],
      ["15000","15 Tons"],
      ["20000","20 Tons"],
      ["30000","30 Tons+"]
    ];

  }else if(
    [
      "Panel Van",
      "Cargo Van",
      "Bus",
      "Minibus"
    ].includes(category)
  ){

    values = [];

  }else{

    values = [];

  }

  select.innerHTML =
    '<option value="">Towing Capacity</option>';

  values.forEach(([value,label])=>{

    const option =
    document.createElement("option");

    option.value = value;

    option.textContent = label;

    select.appendChild(option);

  });

}

function updateLocation(){

  const province =
  val("province");

  const city =
  val("city");

  const location =
  document.getElementById(
    "location"
  );

  if(!location) return;

  location.value =
  city && province
    ? `${city}, ${province}`
    : "";
}

/* =========================================
PHASE 7C — AUTO-NAVIGATE TO FIRST MISSING FIELD
Called by every failed validation check BEFORE
the upload overlay is shown. Scrolls the first
missing/invalid required field into view (safe
against fixed headers on mobile via block:center),
focuses the actual control (works for inputs,
native selects and custom controls), and flashes
the existing validation highlight styling.
========================================= */
function failField(id, message){

  publishInProgress = false;

  const el = document.getElementById(id);

  if(el){

    try{
      el.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }catch(err){
      try{ el.scrollIntoView(true); }catch(_){}
    }

    /* focus the real control — handles native
       inputs/selects and custom wrapper controls */

    let control = el;

    if(
      el.tagName &&
      !["INPUT","SELECT","TEXTAREA","BUTTON"].includes(el.tagName)
    ){
      control =
        el.querySelector("input, select, textarea, button") || el;
    }

    setTimeout(() => {
      try{ control.focus({ preventScroll: true }); }
      catch(err){ try{ control.focus(); }catch(_){} }
    }, 400);

    /* reuse a visible invalid state without changing
       any existing validation rules or mappings */

    el.classList.add("hufa-field-invalid");

    setTimeout(() => {
      el.classList.remove("hufa-field-invalid");
    }, 3000);

  }

  toast(message);

}

function setSubmitDisabled(disabled){

  const btn =
    document.getElementById("submitBtn");

  if(!btn) return;

  btn.disabled = disabled;

  btn.classList.toggle(
    "hufa-submit-disabled",
    disabled
  );

}

function showPublishOverlay(title,status){

  let overlay =
    document.getElementById("publishOverlay");

  /* PHASE 7 FIX — reparent the overlay to <body>. If any
     ancestor creates a containing block for position:fixed
     (transform/filter/backdrop-filter, e.g. the .fade-in
     entrance animation), a fixed overlay inside it would be
     positioned against that ancestor instead of the viewport
     and never be seen. Direct child of <body> is immune. */

  if(overlay && overlay.parentElement !== document.body){
    document.body.appendChild(overlay);
  }

  if(!overlay){

    /* belt-and-braces: if the markup is missing, build it */

    overlay = document.createElement("div");
    overlay.id = "publishOverlay";
    overlay.className = "hufa-publish-overlay";
    overlay.setAttribute("role","alertdialog");
    overlay.setAttribute("aria-live","assertive");
    overlay.setAttribute("aria-busy","true");
    overlay.innerHTML = `
      <div class="hufa-publish-backdrop"></div>
      <div class="hufa-publish-center">
        <div class="hufa-publish-card bg-white">
          <div id="publishSpinner" class="hufa-publish-spinner"></div>
          <p class="hufa-publish-brand">HUFA</p>
          <h2 id="publishTitle" class="hufa-publish-title"></h2>
          <p class="hufa-publish-subtitle">We're securely processing your vehicle listing. Please keep this window open.</p>
          <ul id="publishStages" class="hufa-publish-stages">
            <li data-stage="1"><span class="hufa-stage-dot"></span><span>Preparing vehicle details</span></li>
            <li data-stage="2"><span class="hufa-stage-dot"></span><span>Uploading vehicle images</span></li>
            <li data-stage="3"><span class="hufa-stage-dot"></span><span>Saving vehicle listing</span></li>
            <li data-stage="4"><span class="hufa-stage-dot"></span><span id="publishStageFourLabel">Publishing vehicle</span></li>
            <li data-stage="5"><span class="hufa-stage-dot"></span><span>Finalising</span></li>
          </ul>
          <div class="hufa-publish-bar"><div id="publishProgressBar" class="hufa-publish-bar-fill"></div></div>
          <div id="publishStep" class="hufa-publish-step">Step 1 of 5</div>
          <p id="publishStatus" class="hufa-publish-status"></p>
          <p class="hufa-publish-note">Please keep this window open. Do not close or refresh the page.</p>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

  }

  const progressBar =
    document.getElementById("publishProgressBar");

  const spinner =
    document.getElementById("publishSpinner");

  if(progressBar){

    progressBar.style.width = "0%";

  }

  if(spinner){

    /* restore the animated loading ring state */

    spinner.classList.remove(
      "hufa-publish-spinner-done",
      "hufa-publish-spinner-failed"
    );

    spinner.innerHTML = "";

  }

  /* sync the stage-4 checklist label with the
     existing create vs edit behaviour */

  const stageFourLabel =
    document.getElementById("publishStageFourLabel");

  if(stageFourLabel){

    stageFourLabel.textContent =
      isEdit
        ? "Updating your listing..."
        : "Publishing your vehicle...";

  }

  if(!overlay) return;

  document.getElementById("publishTitle").textContent =
    title;

  document.getElementById("publishStatus").textContent =
    status;

document.body.style.overflow = "hidden";

overlay.classList.remove("hidden");
overlay.classList.add("hufa-publish-visible");

}

function updatePublishStatus(step,status){

  const stepLabel =
    document.getElementById("publishStep");

  const statusLabel =
    document.getElementById("publishStatus");

  const progressBar =
    document.getElementById("publishProgressBar");

  const stages =
    document.querySelectorAll("#publishStages li");

  if(stepLabel){

    stepLabel.textContent =
      `Step ${step} of 5`;

  }

  if(statusLabel){

    statusLabel.textContent =
      status;

  }

  if(progressBar){

    progressBar.style.width =
      `${step * 20}%`;

  }

  /* highlight the active stage and mark
     completed stages with a check state */

  stages.forEach(li => {

    const stageNumber =
      parseInt(li.dataset.stage);

    li.classList.toggle(
      "is-active",
      stageNumber === step
    );

    li.classList.toggle(
      "is-done",
      stageNumber < step
    );

  });

}

function showPublishSuccess(message){

  const overlay =
    document.getElementById("publishOverlay");

  if(!overlay) return;

  const spinner =
    document.getElementById("publishSpinner");

  if(spinner){

    spinner.classList.add(
      "hufa-publish-spinner-done"
    );

    spinner.innerHTML = `
      <svg
        class="hufa-publish-result-icon"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
    `;

  }

  const title =
    document.getElementById("publishTitle");

  const status =
    document.getElementById("publishStatus");

  const step =
    document.getElementById("publishStep");

  if(title){

    title.textContent =
      isEdit
        ? "Vehicle Updated Successfully"
        : "Vehicle Added Successfully";

  }

  if(status){

    status.textContent = message;

  }

  if(step){

    step.textContent = "Complete";

  }

  /* all stages done */

  document
    .querySelectorAll("#publishStages li")
    .forEach(li => {

      li.classList.remove("is-active");

      li.classList.add("is-done");

    });

}

function showPublishFailure(message){

  const overlay =
    document.getElementById("publishOverlay");

  if(!overlay) return;

  const spinner =
    document.getElementById("publishSpinner");

  if(spinner){

    spinner.classList.add(
      "hufa-publish-spinner-failed"
    );

    spinner.innerHTML = `
      <svg
        class="hufa-publish-result-icon"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6 6l12 12M18 6L6 18"
        />
      </svg>
    `;

  }

  const title =
    document.getElementById("publishTitle");

  const status =
    document.getElementById("publishStatus");

  const step =
    document.getElementById("publishStep");

  if(title){

    title.textContent = "Upload Failed";

  }

  if(status){

    status.textContent = message;

  }

  if(step){

    step.textContent = "";

  }

}

function hidePublishOverlay(){

  /* PHASE 6 — restore the submit control so the user can
     retry after a failure (form state is preserved). */

  setSubmitDisabled(false);

  const overlay =
    document.getElementById("publishOverlay");

  if(!overlay) return;

document.body.style.overflow = "";

overlay.classList.remove("hufa-publish-visible");
overlay.classList.add("hidden");
}

function val(id){
  return document.getElementById(id)?.value || "";
}

function valSet(id, value){
  const el = document.getElementById(id);
  if(el) el.value = value || "";
}