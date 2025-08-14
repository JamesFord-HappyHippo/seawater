// Chart and visualization type definitions

import { HazardType, RiskLevel } from './index';

// Base Chart Types
export interface ChartDimensions {
  width: number;
  height: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ChartColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  grid: string;
  axis: string;
}

export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface ChartSeries {
  id: string;
  label: string;
  data: ChartDataPoint[];
  color: string;
  type?: 'line' | 'bar' | 'area' | 'scatter';
  visible?: boolean;
  yAxisId?: string;
}

// Risk Visualization Types
export interface RiskScoreData {
  hazard_type: HazardType;
  current_score: number;
  risk_level: RiskLevel;
  historical_scores?: Array<{
    date: string;
    score: number;
  }>;
  projected_scores?: Array<{
    year: number;
    score: number;
    scenario: string;
  }>;
  sources: Array<{
    name: string;
    score: number;
    weight: number;
  }>;
}

export interface RiskMeterConfig {
  min_value: number;
  max_value: number;
  thresholds: Array<{
    value: number;
    color: string;
    label: RiskLevel;
  }>;
  show_needle: boolean;
  show_labels: boolean;
  show_scale: boolean;
  animate: boolean;
}

export interface RiskBarData {
  label: string;
  value: number;
  max_value: number;
  color: string;
  pattern?: string;
  description?: string;
}

// Time Series Types
export interface TimeSeriesData {
  label: string;
  data: Array<{
    date: Date;
    value: number;
    confidence?: number;
  }>;
  color: string;
  type: 'historical' | 'projected' | 'trend';
  hazard_type?: HazardType;
}

export interface TrendChartConfig {
  show_confidence_intervals: boolean;
  show_data_points: boolean;
  show_trend_lines: boolean;
  interpolation: 'linear' | 'step' | 'smooth';
  time_range: {
    start: Date;
    end: Date;
  };
  y_axis: {
    min?: number;
    max?: number;
    label: string;
    format: 'number' | 'percentage' | 'currency';
  };
}

// Comparison Chart Types
export interface ComparisonData {
  properties: Array<{
    id: string;
    label: string;
    address: string;
    scores: {
      [K in HazardType]?: number;
    };
    overall_score: number;
    rank: number;
  }>;
  metrics: {
    [K in HazardType]?: {
      min: number;
      max: number;
      average: number;
      median: number;
    };
  };
}

export interface RadarChartData {
  property_id: string;
  property_label: string;
  axes: Array<{
    hazard_type: HazardType;
    label: string;
    value: number;
    max_value: number;
    color: string;
  }>;
}

// Heatmap Types
export interface HeatmapData {
  x: string | number;
  y: string | number;
  value: number;
  label?: string;
  color?: string;
}

export interface HeatmapConfig {
  color_scale: string[];
  show_values: boolean;
  show_grid: boolean;
  cell_padding: number;
  responsive: boolean;
}

// Statistical Chart Types
export interface HistogramData {
  bin_start: number;
  bin_end: number;
  count: number;
  percentage: number;
  label: string;
}

export interface BoxPlotData {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
  color: string;
}

export interface ScatterPlotData {
  x: number;
  y: number;
  label: string;
  size?: number;
  color?: string;
  hazard_type?: HazardType;
  property_id?: string;
}

// Map Visualization Types
export interface MapLayerData {
  type: 'heatmap' | 'choropleth' | 'contour' | 'isoline';
  hazard_type: HazardType;
  data: Array<{
    coordinates: [number, number];
    value: number;
    properties?: Record<string, any>;
  }>;
  style: {
    color_scale: string[];
    opacity: number;
    stroke_width?: number;
    stroke_color?: string;
  };
}

export interface LegendData {
  type: 'continuous' | 'discrete' | 'categorical';
  title: string;
  items: Array<{
    color: string;
    label: string;
    value?: number | string;
    range?: [number, number];
  }>;
  orientation: 'horizontal' | 'vertical';
  position: 'top' | 'bottom' | 'left' | 'right';
}

// Interactive Chart Types
export interface ChartInteraction {
  type: 'hover' | 'click' | 'select' | 'zoom' | 'pan';
  enabled: boolean;
  callback?: (event: ChartEvent) => void;
}

export interface ChartEvent {
  type: string;
  data: any;
  coordinates?: {
    x: number;
    y: number;
  };
  dataPoint?: ChartDataPoint;
  series?: ChartSeries;
}

export interface TooltipConfig {
  enabled: boolean;
  follow_cursor: boolean;
  delay: number;
  format: (data: any) => string;
  custom_component?: React.ComponentType<any>;
}

export interface ZoomConfig {
  enabled: boolean;
  type: 'x' | 'y' | 'xy';
  mode: 'select' | 'pan';
  reset_button: boolean;
}

// Chart Export Types
export interface ExportConfig {
  formats: ('png' | 'jpg' | 'svg' | 'pdf')[];
  filename: string;
  scale: number;
  background_color: string;
  include_data: boolean;
}

// Animation Types
export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay: number;
  stagger?: number;
}

// Theme Types
export interface ChartTheme {
  name: string;
  colors: ChartColors;
  fonts: {
    title: string;
    axis: string;
    legend: string;
    tooltip: string;
  };
  sizes: {
    title: number;
    axis: number;
    legend: number;
    tooltip: number;
  };
  spacing: {
    padding: number;
    margin: number;
    grid: number;
  };
}

// Dashboard Chart Types
export interface DashboardChart {
  id: string;
  type: 'risk_score' | 'trend' | 'comparison' | 'map' | 'histogram' | 'meter';
  title: string;
  description?: string;
  data: any;
  config: any;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  refresh_interval?: number;
  last_updated?: Date;
}

export interface DashboardLayout {
  id: string;
  name: string;
  charts: DashboardChart[];
  grid_config: {
    columns: number;
    row_height: number;
    margin: [number, number];
    container_padding: [number, number];
  };
  auto_refresh: boolean;
  refresh_interval: number;
}

// Chart Component Props
export interface BaseChartProps {
  width?: number;
  height?: number;
  responsive?: boolean;
  theme?: ChartTheme;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string;
  className?: string;
  testId?: string;
}

export interface RiskScoreWidgetProps extends BaseChartProps {
  hazard_type: HazardType;
  score: number;
  risk_level: RiskLevel;
  show_sources?: boolean;
  show_trend?: boolean;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  onClick?: (data: RiskScoreData) => void;
}

export interface TrendChartProps extends BaseChartProps {
  data: TimeSeriesData[];
  config?: Partial<TrendChartConfig>;
  interactions?: ChartInteraction[];
  tooltip?: TooltipConfig;
  zoom?: ZoomConfig;
  export_config?: ExportConfig;
}

export interface ComparisonChartProps extends BaseChartProps {
  data: ComparisonData;
  chart_type: 'bar' | 'radar' | 'parallel';
  highlight_best?: boolean;
  highlight_worst?: boolean;
  show_averages?: boolean;
  onPropertySelect?: (property_id: string) => void;
}

// Export utility types
export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'area' 
  | 'scatter' 
  | 'pie' 
  | 'donut' 
  | 'radar' 
  | 'heatmap' 
  | 'gauge' 
  | 'histogram' 
  | 'box-plot';

export type DataFormat = 'number' | 'percentage' | 'currency' | 'date' | 'custom';
export type TimeGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'decade';