/*
management-interface - Web based management of Raspberry Pis over WiFi
Copyright (C) 2018, The Cacophony Project

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

package api

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	signalstrength "github.com/TheCacophonyProject/management-interface/signal-strength"
	"github.com/TheCacophonyProject/rs485-controller/trapController"
	"github.com/godbus/dbus"
	"github.com/gorilla/mux"
)

const (
	cptvGlob            = "*.cptv"
	failedUploadsFolder = "failed-uploads"
)

type ManagementAPI struct {
	cptvDir string
}

func NewAPI(cptvDir string) *ManagementAPI {
	return &ManagementAPI{
		cptvDir: cptvDir,
	}
}

func (api *ManagementAPI) GetAllDigitalPins(w http.ResponseWriter, r *http.Request) {
	result, err := trapController.DigitalPinReadAll(true)
	w.WriteHeader(http.StatusOK)
	if err != nil {
		io.WriteString(w, err.Error())
		return
	}
	json.NewEncoder(w).Encode(result)
}

func (api *ManagementAPI) GetAllServos(w http.ResponseWriter, r *http.Request) {
	result, err := trapController.ServoReadAll(true)
	w.WriteHeader(http.StatusOK)
	if err != nil {
		io.WriteString(w, err.Error())
		return
	}
	json.NewEncoder(w).Encode(result)
}

func (api *ManagementAPI) GetAllActuators(w http.ResponseWriter, r *http.Request) {
	result, err := trapController.ActuatorReadAll(true)
	w.WriteHeader(http.StatusOK)
	if err != nil {
		io.WriteString(w, err.Error())
		return
	}
	json.NewEncoder(w).Encode(result)
}

func (api *ManagementAPI) PostDigitalPin(w http.ResponseWriter, r *http.Request) {
	name, val, err := getNameAndVal(r)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		io.WriteString(w, err.Error())
		return
	}
	err = trapController.DigitalPinWrite(name, val)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		io.WriteString(w, err.Error())
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (api *ManagementAPI) PostServo(w http.ResponseWriter, r *http.Request) {
	name, val, err := getNameAndVal(r)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		io.WriteString(w, err.Error())
		return
	}
	err = trapController.ServoWrite(name, val)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		io.WriteString(w, err.Error())
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (api *ManagementAPI) PostActuator(w http.ResponseWriter, r *http.Request) {
	name, val, err := getNameAndVal(r)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		io.WriteString(w, err.Error())
		return
	}
	err = trapController.ActuatorWrite(name, val)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		io.WriteString(w, err.Error())
		return
	}
	w.WriteHeader(http.StatusOK)
}

func getNameAndVal(r *http.Request) (name string, val uint16, err error) {
	name = r.FormValue("name")
	valInt, err := strconv.Atoi(r.FormValue("value"))
	if err != nil {
		return
	}
	val = uint16(valInt)
	return
}

// GetRecordings returns a list of cptv files in a array.
func (api *ManagementAPI) GetRecordings(w http.ResponseWriter, r *http.Request) {
	log.Println("get recordings")
	names := getCptvNames(api.cptvDir)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(names)
}

func (api *ManagementAPI) GetSignalStrength(w http.ResponseWriter, r *http.Request) {
	sig, err := signalstrength.Run()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		io.WriteString(w, "failed to connect to modem\n")
		return
	}
	w.WriteHeader(http.StatusOK)
	io.WriteString(w, strconv.Itoa(sig))
}

// GetRecording downloads a cptv file
func (api *ManagementAPI) GetRecording(w http.ResponseWriter, r *http.Request) {
	cptvName := mux.Vars(r)["id"]
	log.Printf("get recording '%s'", cptvName)
	cptvPath := getRecordingPath(cptvName, api.cptvDir)
	if cptvPath == "" {
		w.WriteHeader(http.StatusBadRequest)
		io.WriteString(w, "cptv file not found\n")
		return
	}

	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, cptvName))
	w.Header().Set("Content-Type", "application/x-cptv")
	f, err := os.Open(cptvPath)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Println(err)
		return
	}
	defer f.Close()
	w.WriteHeader(http.StatusOK)
	io.Copy(w, bufio.NewReader(f))
}

// DeleteRecording deletes the given cptv file
func (api *ManagementAPI) DeleteRecording(w http.ResponseWriter, r *http.Request) {
	cptvName := mux.Vars(r)["id"]
	log.Printf("delete cptv '%s'", cptvName)
	recPath := getRecordingPath(cptvName, api.cptvDir)
	if recPath == "" {
		w.WriteHeader(http.StatusOK)
		io.WriteString(w, "cptv file not found\n")
		return
	}
	err := os.Remove(recPath)
	if os.IsNotExist(err) {
		w.WriteHeader(http.StatusOK)
		io.WriteString(w, "cptv file not found\n")
		return
	} else if err != nil {
		log.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		io.WriteString(w, "failed to delete file")
		return
	}
	w.WriteHeader(http.StatusOK)
	io.WriteString(w, "cptv file deleted")
}

// TakeSnapshot will request a new snapshot to be taken by thermal-recorder
func (api *ManagementAPI) TakeSnapshot(w http.ResponseWriter, r *http.Request) {
	conn, err := dbus.SystemBus()
	recorder := conn.Object("org.cacophony.thermalrecorder", "/org/cacophony/thermalrecorder")
	err = recorder.Call("org.cacophony.thermalrecorder.TakeSnapshot", 0).Err
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func getCptvNames(dir string) []string {
	matches, _ := filepath.Glob(filepath.Join(dir, cptvGlob))
	failedUploadMatches, _ := filepath.Glob(filepath.Join(dir, failedUploadsFolder, cptvGlob))
	matches = append(matches, failedUploadMatches...)
	names := make([]string, len(matches))
	for i, filename := range matches {
		names[i] = filepath.Base(filename)
	}
	return names
}

func getRecordingPath(cptv, dir string) string {
	// Check that given file is a cptv file on the device.
	isCptvFile := false
	for _, name := range getCptvNames(dir) {
		if name == cptv {
			isCptvFile = true
			break
		}
	}
	if !isCptvFile {
		return ""
	}
	paths := []string{
		filepath.Join(dir, cptv),
		filepath.Join(dir, failedUploadsFolder, cptv),
	}
	for _, path := range paths {
		if _, err := os.Stat(path); !os.IsNotExist(err) {
			return path
		}
	}
	return ""
}
