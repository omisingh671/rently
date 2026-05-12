import type { ElementType } from "react";

/* ========= FEATHER ========= */
import {
  FiWifi,
  FiGlobe,
  FiZap,
  FiBatteryCharging,
  FiArrowUp,
  FiDroplet,
  FiCloudRain,
  FiShield,
  FiCamera,
  FiLock,
  FiAlertTriangle,
  FiWind,
  FiSun,
  FiNavigation,
  FiPackage,
  FiTool,
  FiBriefcase,
  FiCoffee,
  FiUsers,
  FiUserCheck,
  FiPhone,
  FiVideo,
  FiPlay,
  FiCheckSquare,
  FiPlusSquare,
  FiSlash,
} from "react-icons/fi";

/* ========= FONT AWESOME ========= */
import {
  FaParking,
  FaCar,
  FaBroom,
  FaDumbbell,
  FaSwimmingPool,
  FaPhoneAlt,
  FaChargingStation,
  FaChalkboardTeacher,
  FaWheelchair,
  FaPaw,
  FaFirstAid,
} from "react-icons/fa";

/* ========= MATERIAL DESIGN ========= */
import {
  MdLocalLaundryService,
  MdKitchen,
  MdTv,
  MdMicrowave,
  MdChair,
  MdWeekend,
  MdDoorFront,
  MdHotel,
  MdWaterDrop,
  MdBathroom,
  MdHotTub,
  MdDesk,
  MdCleaningServices,
  MdRoomService,
  MdBuild,
  MdSupportAgent,
  MdSensors,
  MdLock,
  MdYard,
} from "react-icons/md";

/* ========= GAME ICONS ========= */
import { GiGasStove } from "react-icons/gi";

export const ICON_REGISTRY: Record<string, ElementType> = {
  /* Connectivity */
  FiWifi,
  FiGlobe,

  /* Power */
  FiZap,
  FiBatteryCharging,

  /* Building / Access */
  FiArrowUp,
  FaParking,
  FaCar,

  /* Water */
  FiDroplet,
  FiCloudRain,
  MdWaterDrop,

  /* Security */
  FiShield,
  FiCamera,
  FiLock,
  MdLock,
  FiAlertTriangle,
  MdSensors,

  /* Comfort */
  FiWind,
  FiSun,
  FiNavigation,
  MdHotTub,

  /* Furnishing */
  FiPackage,
  MdChair,
  MdWeekend,
  MdDoorFront,
  MdHotel,

  /* Appliances */
  MdLocalLaundryService,
  MdKitchen,
  MdTv,
  MdMicrowave,

  /* Kitchen */
  GiGasStove,

  /* Lifestyle */
  FaDumbbell,
  FaSwimmingPool,
  MdYard,

  /* Maintenance */
  FaBroom,
  FiTool,
  MdCleaningServices,
  MdBuild,

  /* Services */
  MdRoomService,
  MdSupportAgent,
  FaPhoneAlt,
  FiPhone,

  /* Workspace */
  FiBriefcase,
  MdDesk,

  /* Dining */
  FiCoffee,

  /* Bathroom */
  MdBathroom,

  /* Safety */
  FaFirstAid,

  /* EV */
  FaChargingStation,

  /* Business */
  FiUsers,
  FaChalkboardTeacher,

  /* Accessibility */
  FaWheelchair,

  /* Policies */
  FaPaw,
  FiSlash,

  /* Misc UI */
  FiVideo,
  FiPlay,
  FiCheckSquare,
  FiPlusSquare,
  FiUserCheck,
};
