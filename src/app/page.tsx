'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import mqtt from 'mqtt'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BellIcon, XCircleIcon, ChevronUpIcon, ChevronDownIcon, RefreshCwIcon, DownloadIcon, MoonIcon, SunIcon } from 'lucide-react'

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

export default function DashboardComponent() {
  const [sensorData, setSensorData] = useState<SensorData[]>([])
  const [latestData, setLatestData] = useState<SensorData | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isAlertsPanelOpen, setIsAlertsPanelOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [selectedColumns, setSelectedColumns] = useState({
    timestamp: true,
    voltage: true,
    current1: true,
    current2: true,
    current3: true,
    temperature: true,
    humidity: true,
    warning: true,
    error: true
  })
  const clientRef = useRef<mqtt.MqttClient | null>(null)

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
      }
    }

    return { ...data, warning, error }
  }, [])

  useEffect(() => {
    clientRef.current = mqtt.connect('wss://test.mosquitto.org:8081')

    clientRef.current.on('connect', () => {
      console.log('Connected to MQTT broker')
      clientRef.current?.subscribe('r04nx')
    })

    clientRef.current.on('message', (topic, message) => {
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
    })

    return () => {
      clientRef.current?.end()
    }
  }, [checkThresholds])

  const playErrorSound = () => {
    const audio = new Audio('/error-sound.mp3')
    audio.play()
  }

  const dismissAlert = (index: number) => {
    setAlerts(prevAlerts => prevAlerts.filter((_, i) => i !== index))
  }

  const getStatusColor = (value: number, thresholds: { warning: number, error: number }) => {
    if (value >= thresholds.error) return 'text-red-500 dark:text-red-400'
    if (value >= thresholds.warning) return 'text-yellow-500 dark:text-yellow-400'
    return 'text-green-500 dark:text-green-400'
  }

  const refreshData = () => {
    // clientRef.current?.publish('r04nx', 'refresh')
    console.log("Refreshed data");
  }

  const downloadCSV = () => {
    const filteredData = sensorData.filter(data => 
      (!startDate || data.timestamp >= startDate.getTime()) &&
      (!endDate || data.timestamp <= endDate.getTime())
    )

    const headers = Object.keys(selectedColumns)
      .filter(key => selectedColumns[key as keyof typeof selectedColumns])
      .join(',')

    const csvContent = [headers].concat(filteredData.map(row => 
      Object.keys(selectedColumns)
        .filter(key => selectedColumns[key as keyof typeof selectedColumns])
        .map(key => {
          if (key === 'timestamp') return new Date(row[key]).toISOString()
          return row[key as keyof SensorData]
        })
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
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="bg-gray-100 dark:bg-gray-900 p-4 sm:p-8 min-h-screen">
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-2xl font-bold dark:text-white">Dashboard</CardTitle>
              <p className="text-gray-500 dark:text-gray-400">{new Date().toLocaleString()}</p>
            </div>
            <div className="flex space-x-2 flex-wrap gap-2">
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <div className="flex space-x-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              {startDate ? startDate.toLocaleDateString() : 'Start Date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              {endDate ? endDate.toLocaleDateString() : 'End Date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Columns</Label>
                      {Object.keys(selectedColumns).map(column => (
                        <div key={column} className="flex items-center space-x-2">
                          <Switch
                            id={`column-${column}`}
                            checked={selectedColumns[column as keyof typeof selectedColumns]}
                            onCheckedChange={(checked) => 
                              setSelectedColumns(prev => ({ ...prev, [column]: checked }))
                            }
                          />
                          <Label htmlFor={`column-${column}`}>{column}</Label>
                        </div>
                      ))}
                    </div>
                    <Button onClick={downloadCSV}>Download</Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={toggleDarkMode}>
                {isDarkMode ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="overflow-hidden dark:bg-gray-800">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg dark:text-white">Voltage</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className={`text-2xl sm:text-4xl font-bold ${getStatusColor(latestData?.voltage || 0, { warning: THRESHOLDS.VOLTAGE.LOW_AC_WARNING, error: THRESHOLDS.VOLTAGE.LOW_DC_ERROR })}`}>
                    {latestData?.voltage.toFixed(2)} V
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden dark:bg-gray-800">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg dark:text-white">Current 1</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className={`text-2xl sm:text-4xl font-bold ${getStatusColor(latestData?.current1 || 0, { warning: THRESHOLDS.CURRENT.CRITICAL_LOAD, error: THRESHOLDS.CURRENT.CRITICAL_LOAD * 1.2 })}`}>
                    {latestData?.current1.toFixed(2)} A
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden dark:bg-gray-800">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg dark:text-white">Current 2</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-2xl sm:text-4xl font-bold text-green-500 dark:text-green-400">
                    {latestData?.current2.toFixed(2)} A
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden dark:bg-gray-800">
                <CardHeader  className="p-4">
                  <CardTitle className="text-lg dark:text-white">Current 3</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-2xl sm:text-4xl font-bold text-green-500 dark:text-green-400">
                    {latestData?.current3.toFixed(2)} A
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden dark:bg-gray-800">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg dark:text-white">Temperature</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-2xl sm:text-4xl font-bold text-green-500 dark:text-green-400">
                    {latestData?.temperature.toFixed(2)} °C
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden dark:bg-gray-800">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg dark:text-white">Humidity</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-2xl sm:text-4xl font-bold text-green-500 dark:text-green-400">
                    {latestData?.humidity.toFixed(2)} %
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-8">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-white">Voltage Trend</CardTitle>
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
                  <Tooltip 
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    contentStyle={{ backgroundColor: isDarkMode ? "#374151" : "#fff", border: "none" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="voltage" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-white">Current Readings</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sensorData.slice(-1)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} 
                    stroke={isDarkMode ? "#fff" : "#000"}
                  />
                  <YAxis stroke={isDarkMode ? "#fff" : "#000"} />
                  <Tooltip 
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    contentStyle={{ backgroundColor: isDarkMode ? "#374151" : "#fff", border: "none" }}
                  />
                  <Legend />
                  <Bar dataKey="current1" fill="#8884d8" />
                  <Bar dataKey="current2" fill="#82ca9d" />
                  <Bar dataKey="current3" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold dark:text-white">Alerts</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAlertsPanelOpen(!isAlertsPanelOpen)}
              className="lg:hidden"
            >
              {isAlertsPanelOpen ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : 
                <ChevronDownIcon className="h-4 w-4" />
              }
            </Button>
          </CardHeader>
          <CardContent className={`${isAlertsPanelOpen ? '' : 'hidden lg:block'}`}>
            {alerts.length === 0 ? (
              <p className="dark:text-gray-300">No active alerts</p>
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
    </div>
  )
}