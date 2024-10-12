'use client'

import { useState, useEffect, useCallback } from 'react'
import mqtt from 'mqtt'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BellIcon, XCircleIcon, ChevronUpIcon, ChevronDownIcon, RefreshCwIcon, DownloadIcon, CalendarIcon, MoonIcon, SunIcon, MenuIcon } from 'lucide-react'
import { format } from 'date-fns'

// Threshold constants
const THRESHOLDS = {
  VOLTAGE: {
    LOW_AC_WARNING: 120,
    HIGH_AC_WARNING: 200,
    HIGH_DC_WARNING: 54,
    LOW_DC_ERROR: 40,
    HIGH_AC_ERROR: 240,
    LOW_DC_ERROR_SECONDARY: 46,
    HIGH_DC_ERROR: 60,
    MAINS_FAILURE: 0,
    LOW_AC_ERROR: 110
  },
  CURRENT: {
    CRITICAL_LOAD: 70
  }
}

type SensorData = {
  voltage: number
  current1: number
  current2: number
  current3: number
  temperature: number
  humidity: number
  timestamp: number
  warning: string
  error: string
}

type Alert = {
  message: string
  type: 'warning' | 'error'
  timestamp: number
}

type DownloadFilter = {
  startDate: Date | undefined
  endDate: Date | undefined
  columns: {
    timestamp: boolean
    voltage: boolean
    current1: boolean
    current2: boolean
    current3: boolean
    temperature: boolean
    humidity: boolean
    warning: boolean
    error: boolean
  }
}

let csvData: SensorData[] = []

export default function DashboardComponent() {
  const [sensorData, setSensorData] = useState<SensorData[]>([])
  const [latestData, setLatestData] = useState<SensorData | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isAlertsPanelOpen, setIsAlertsPanelOpen] = useState(false)
  const [downloadFilter, setDownloadFilter] = useState<DownloadFilter>({
    startDate: undefined,
    endDate: undefined,
    columns: {
      timestamp: true,
      voltage: true,
      current1: true,
      current2: true,
      current3: true,
      temperature: true,
      humidity: true,
      warning: true,
      error: true
    }
  })
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)

  const checkThresholds = useCallback((data: SensorData) => {
    const newAlerts: Alert[] = []
    let warning = ''
    let error = ''

    // Voltage checks
    if (data.voltage < THRESHOLDS.VOLTAGE.LOW_AC_WARNING) {
      newAlerts.push({ message: 'Low AC voltage warning', type: 'warning', timestamp: Date.now() })
      warning += 'Low AC voltage;'
    }
    if (data.voltage > THRESHOLDS.VOLTAGE.HIGH_AC_WARNING) {
      newAlerts.push({ message: 'High AC voltage warning', type: 'warning', timestamp: Date.now() })
      warning += 'High AC voltage;'
    }
    if (data.voltage > THRESHOLDS.VOLTAGE.HIGH_DC_WARNING) {
      newAlerts.push({ message: 'High DC voltage warning', type: 'warning', timestamp: Date.now() })
      warning += 'High DC voltage;'
    }
    if (data.voltage < THRESHOLDS.VOLTAGE.LOW_DC_ERROR) {
      newAlerts.push({ message: 'Low DC voltage error', type: 'error', timestamp: Date.now() })
      error += 'Low DC voltage;'
    }
    if (data.voltage > THRESHOLDS.VOLTAGE.HIGH_AC_ERROR) {
      newAlerts.push({ message: 'High AC voltage error', type: 'error', timestamp: Date.now() })
      error += 'High AC voltage;'
    }
    if (data.voltage < THRESHOLDS.VOLTAGE.LOW_DC_ERROR_SECONDARY) {
      newAlerts.push({ message: 'Low DC voltage error (46V)', type: 'error', timestamp: Date.now() })
      error += 'Low DC voltage (46V);'
    }
    if (data.voltage > THRESHOLDS.VOLTAGE.HIGH_DC_ERROR) {
      newAlerts.push({ message: 'High DC voltage error', type: 'error', timestamp: Date.now() })
      error += 'High DC voltage;'
    }
    if (data.voltage === THRESHOLDS.VOLTAGE.MAINS_FAILURE) {
      newAlerts.push({ message: 'Mains failure', type: 'error', timestamp: Date.now() })
      error += 'Mains failure;'
    }
    if (data.voltage < THRESHOLDS.VOLTAGE.LOW_AC_ERROR) {
      newAlerts.push({ message: 'Low AC voltage error', type: 'error', timestamp: Date.now() })
      error += 'Low AC voltage;'
    }

    // Current checks
    if (data.current1 > THRESHOLDS.CURRENT.CRITICAL_LOAD) {
      newAlerts.push({ message: 'Critical load condition (overload)', type: 'warning', timestamp: Date.now() })
      warning += 'Critical load;'
    }

    if (newAlerts.length > 0) {
      setAlerts(prevAlerts => [...prevAlerts, ...newAlerts])
      if (newAlerts.some(alert => alert.type === 'error')) {
        playErrorSound()
        sendPushNotification('⚠️ Error Alert', newAlerts.filter(a => a.type === 'error').map(a => a.message).join(', '))
      } else if (newAlerts.some(alert => alert.type === 'warning')) {
        sendPushNotification('⚠️ Warning Alert', newAlerts.filter(a => a.type === 'warning').map(a => a.message).join(', '))
      }
    }

    return { ...data, warning, error }
  }, [])

  useEffect(() => {
    const client = mqtt.connect('wss://test.mosquitto.org:8081')

    client.on('connect', () => {
      console.log('Connected to MQTT broker')
      client.subscribe('r04nx')
    })

    client.on('message', (topic, message) => {
      const [voltage, current1, current2, current3, temperature, humidity] = message.toString().split(',').map(Number)
      const newData: SensorData = {
        voltage,
        current1,
        current2,
        current3,
        temperature,
        humidity,
        timestamp: Date.now(),
        warning: '',
        error: ''
      }
      const checkedData = checkThresholds(newData)
      setSensorData(prevData => [...prevData.slice(-60), checkedData])
      setLatestData(checkedData)
      csvData.push(checkedData)
    })

    return () => {
      client.end()
    }
  }, [checkThresholds])

  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission()
    }
  }, [])

  const playErrorSound = () => {
    const audio = new Audio('/error-sound.mp3')
    audio.play()
  }

  const sendPushNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification(title, { body })
    }
  }

  const dismissAlert = (index: number) => {
    setAlerts(prevAlerts => prevAlerts.filter((_, i) => i !== index))
  }

  const getStatusColor = (value: number, thresholds: { warning: number, error: number }) => {
    if (value >= thresholds.error) return isDarkMode ? 'text-red-400' : 'text-red-500'
    if (value >= thresholds.warning) return isDarkMode ? 'text-yellow-400' : 'text-yellow-500'
    return isDarkMode ? 'text-green-400' : 'text-green-500'
  }

  const refreshData = () => {
    window.location.reload();
  }

  const downloadCSV = () => {
    const { startDate, endDate, columns } = downloadFilter
    const filteredData = csvData.filter(row => 
      (!startDate || row.timestamp >= startDate.getTime()) &&
      (!endDate || row.timestamp <= endDate.getTime())
    )

    const headers = Object.entries(columns)
      .filter(([_, include]) => include)
      .map(([key]) => key)
      .join(',')

    const csvContent = [headers].concat(filteredData.map(row => 
      Object.entries(columns)
        .filter(([_, include]) => include)
        .map(([key]) => row[key as keyof SensorData])
        .join(',')
    )).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', 'sensor_data.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    setIsDownloadModalOpen(false)
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const DownloadFilterContent = () => (
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Date Range</h4>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {downloadFilter.startDate ? format(downloadFilter.startDate, "PPP") : <span>Pick a start date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={downloadFilter.startDate}
                onSelect={(date) => setDownloadFilter(prev => ({ ...prev, startDate: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {downloadFilter.endDate ? format(downloadFilter.endDate, "PPP") : <span>Pick an end date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={downloadFilter.endDate}
                onSelect={(date) => setDownloadFilter(prev => ({ ...prev, endDate: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Columns</h4>
        {Object.entries(downloadFilter.columns).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-2">
            <Switch
              id={`filter-${key}`}
              checked={value}
              onCheckedChange={(checked) => 
                setDownloadFilter(prev => ({
                  ...prev,
                  columns: { ...prev.columns, [key]: checked }
                }))
              }
            />
            <Label htmlFor={`filter-${key}`}>{key}</Label>
          </div>
        ))}
      </div>
      <Button onClick={downloadCSV}>Download</Button>
    </div>
  )

  return (
    <div className={`min-h-screen p-4 sm:p-8 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
      <Card className={`mb-8 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Sensor Data Monitoring Dashboard</CardTitle>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{new Date().toLocaleString()}</p>
          </div>
          <div className="flex space-x-2">
            <div className="hidden sm:flex space-x-2">
              <Button variant="outline" size="sm" onClick={refreshData}>
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <DownloadFilterContent />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={toggleDarkMode}>
                {isDarkMode ? <SunIcon  className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              </Button>
            </div>
            <div className="sm:hidden">
              <Button variant="outline" size="sm" onClick={toggleMobileMenu}>
                <MenuIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {isMobileMenuOpen && (
          <CardContent className="sm:hidden">
            <div className="flex flex-col space-y-2">
              <Button variant="outline" size="sm" onClick={refreshData}>
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Download CSV</DialogTitle>
                  </DialogHeader>
                  <DownloadFilterContent />
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={toggleDarkMode}>
                {isDarkMode ? <SunIcon className="h-4 w-4 mr-2" /> : <MoonIcon className="h-4 w-4 mr-2" />}
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </Button>
            </div>
          </CardContent>
        )}
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className={`overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Voltage</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className={`text-2xl sm:text-4xl font-bold ${latestData?.error.includes('voltage') || latestData?.warning.includes('voltage') ? 'text-red-500' : getStatusColor(latestData?.voltage || 0, { warning: THRESHOLDS.VOLTAGE.LOW_AC_WARNING, error: THRESHOLDS.VOLTAGE.LOW_DC_ERROR })}`}>
                  {latestData?.voltage.toFixed(2)} V
                </p>
              </CardContent>
            </Card>
            <Card className={`overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Current 1</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className={`text-2xl sm:text-4xl font-bold ${latestData?.warning.includes('Critical load') ? 'text-red-500' : getStatusColor(latestData?.current1 || 0, { warning: THRESHOLDS.CURRENT.CRITICAL_LOAD, error: THRESHOLDS.CURRENT.CRITICAL_LOAD * 1.2 })}`}>
                  {latestData?.current1.toFixed(2)} A
                </p>
              </CardContent>
            </Card>
            <Card className={`overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Current 2</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className={`text-2xl sm:text-4xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-500'}`}>
                  {latestData?.current2.toFixed(2)} A
                </p>
              </CardContent>
            </Card>
            <Card className={`overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Current 3</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className={`text-2xl sm:text-4xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-500'}`}>
                  {latestData?.current3.toFixed(2)} A
                </p>
              </CardContent>
            </Card>
            <Card className={`overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Temperature</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className={`text-2xl sm:text-4xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-500'}`}>
                  {latestData?.temperature.toFixed(2)} °C
                </p>
              </CardContent>
            </Card>
            <Card className={`overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <CardHeader className="p-4">
                <CardTitle className="text-lg">Humidity</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className={`text-2xl sm:text-4xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-500'}`}>
                  {latestData?.humidity.toFixed(2)} %
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
          <CardHeader>
            <CardTitle>Voltage Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} 
                  stroke={isDarkMode ? "#fff" : "#000"}
                />
                <YAxis stroke={isDarkMode ? "#fff" : "#000"} />
                <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} />
                <Legend />
                <defs>
                  <linearGradient id="colorVoltage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Line 
                  type="monotone" 
                  dataKey="voltage" 
                  stroke="#8884d8" 
                  fillOpacity={1} 
                  fill="url(#colorVoltage)" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
          <CardHeader>
            <CardTitle>Current Readings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} 
                  stroke={isDarkMode ? "#fff" : "#000"}
                />
                <YAxis stroke={isDarkMode ? "#fff" : "#000"} />
                <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} />
                <Legend />
                <defs>
                  <linearGradient id="colorCurrent1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCurrent2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCurrent3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ffc658" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="current1" stroke="#8884d8" fillOpacity={1} fill="url(#colorCurrent1)" />
                <Area type="monotone" dataKey="current2" stroke="#82ca9d" fillOpacity={1} fill="url(#colorCurrent2)" />
                <Area type="monotone" dataKey="current3" stroke="#ffc658" fillOpacity={1} fill="url(#colorCurrent3)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
          <CardHeader>
            <CardTitle>Temperature Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} 
                  stroke={isDarkMode ? "#fff" : "#000"}
                />
                <YAxis stroke={isDarkMode ? "#fff" : "#000"} />
                <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} />
                <Legend />
                <defs>
                  <linearGradient id="colorTemperature" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#82ca9d" 
                  fillOpacity={1} 
                  fill="url(#colorTemperature)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
          <CardHeader>
            <CardTitle>Humidity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} 
                  stroke={isDarkMode ? "#fff" : "#000"}
                />
                <YAxis stroke={isDarkMode ? "#fff" : "#000"} />
                <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} />
                <Legend />
                <defs>
                  <linearGradient id="colorHumidity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ffc658" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="humidity" 
                  stroke="#ffc658" 
                  fillOpacity={1} 
                  fill="url(#colorHumidity)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className={`mt-8 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Alerts</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAlertsPanelOpen(!isAlertsPanelOpen)}
            className="lg:hidden"
          >
            {isAlertsPanelOpen ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        <CardContent className={`${isAlertsPanelOpen ? '' : 'hidden lg:block'}`}>
          {alerts.length === 0 ? (
            <p>No active alerts</p>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'}>
                  <AlertTitle className="flex items-center">
                    <BellIcon className="h-4 w-4 mr-2" />
                    {alert.type === 'error' ? 'Error' : 'Warning'}
                  </AlertTitle>
                  <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <span>{alert.message} - {new Date(alert.timestamp).toLocaleString()}</span>
                    <Button variant="outline" size="sm" onClick={() => dismissAlert(index)} className="mt-2 sm:mt-0">
                      Dismiss
                    </Button>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}