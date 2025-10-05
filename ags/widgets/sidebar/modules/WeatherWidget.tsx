// widgets/sidebar/modules/WeatherWidget.tsx
import { Gtk } from "ags/gtk4";
import { With } from "ags";
import {
  formatBlockTime,
  getIcon,
  WeatherService,
  WeatherCondition,
} from "utils/weather";

/** ---------- Components ---------- **/
interface StatItemProps {
  icon: string;
  value: string;
}

interface ForecastItemProps {
  block: WeatherCondition;
}

function StatItem({ icon, value }: StatItemProps) {
  return (
    <box
      class="stat-item"
      orientation={Gtk.Orientation.HORIZONTAL}
      spacing={10}
      halign={Gtk.Align.FILL}
    >
      <label label={icon} class="weather-extra-icon" />
      <label label={value} hexpand halign={Gtk.Align.END} />
    </box>
  );
}

function ForecastItem({ block }: ForecastItemProps) {
  const icon = getIcon(block.weatherDesc?.[0]?.value ?? "");
  const temp = block.tempC ?? "?";
  const time = formatBlockTime(block.time ?? "0");

  return (
    <box
      class="forecast-item"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={4}
      halign={Gtk.Align.CENTER}
    >
      <label label={time} class="forecast-hour" />
      <label label={icon} class="forecast-icon" />
      <label label={`${temp}°`} class="forecast-temp" />
    </box>
  );
}

/** ---------- Weather Widget ---------- **/
export default function WeatherWidget() {
  return (
    <box
      class="weather-widget"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={0}
    >
      <With value={WeatherService.weather}>
        {(data) => {
          if (!data || !data.current) {
            return (
              <box class="weather-loading" halign={Gtk.Align.CENTER}>
                <label label="Loading weather..." />
              </box>
            );
          }

          const current = data.current;
          const today = data.forecast?.[0];
          
          // Extract location from nearest_area if available
          const nearestArea = (data as any).nearest_area?.[0];
          const location = nearestArea
            ? [
                nearestArea.areaName?.[0]?.value,
                nearestArea.region?.[0]?.value || nearestArea.country?.[0]?.value
              ].filter(Boolean).join(", ")
            : "Unknown Location";
          
          // Get forecast items
          const forecastItems = today?.hourly
            ?.slice(0, 5)
            .map((block) => <ForecastItem block={block} />) || [];

          // Current weather data
          const currentIcon = getIcon(current.weatherDesc?.[0]?.value ?? "");
          const currentTemp = current.tempC ?? "?";
          const feelsLike = current.FeelsLikeC ?? "?";
          const wind = current.windspeedKmph ?? "?";
          const humidity = current.humidity ?? "?";
          const weatherDesc = current.weatherDesc?.[0]?.value ?? "Unknown";

          const statsData = [
            { icon: "Device_Thermostat", value: `Feels like ${feelsLike}°C` },
            { icon: "Air", value: `Wind ${wind} km/h` },
            { icon: "Water_Drop", value: `Humidity ${humidity}%` },
          ];

          return (
            <box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
              {/* Location Header */}
              <box
                class="weather-location"
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={8}
                halign={Gtk.Align.CENTER}
              >
                <label label="Location_On" class="location-icon" />
                <label label={location} class="location-text" />
              </box>

              {/* Current Weather */}
              <box
                class="current-weather"
                orientation={Gtk.Orientation.VERTICAL}
                spacing={0}
              >
                {/* Main temp and icon */}
                <box
                  orientation={Gtk.Orientation.VERTICAL}
                  halign={Gtk.Align.CENTER}
                  spacing={4}
                >
                  <label label={currentIcon} class="current-icon" />
                  <label
                    label={`${currentTemp}°C`}
                    class="weather-temp"
                    halign={Gtk.Align.CENTER}
                  />
                  <label
                    label={weatherDesc}
                    class="weather-desc"
                    halign={Gtk.Align.CENTER}
                  />
                </box>

                {/* Weather Stats */}
                <box
                  class="weather-stats"
                  orientation={Gtk.Orientation.VERTICAL}
                  spacing={4}
                >
                  {statsData.map((stat) => (
                    <StatItem icon={stat.icon} value={stat.value} />
                  ))}
                </box>
              </box>

              {/* Forecast */}
              {forecastItems.length > 0 && (
                <box 
                  class="forecast-row" 
                  orientation={Gtk.Orientation.HORIZONTAL}
                  spacing={8} 
                  halign={Gtk.Align.CENTER}
                >
                  {forecastItems}
                </box>
              )}
            </box>
          );
        }}
      </With>
    </box>
  );
}