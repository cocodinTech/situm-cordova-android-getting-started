import { Component, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { NavController, NavParams, Platform, Events, LoadingController } from 'ionic-angular';
import { DomSanitizer } from '@angular/platform-browser';
import { GoogleMaps, GoogleMap, GoogleMapsEvent, GoogleMapOptions, LatLng, ILatLng, GroundOverlayOptions, GroundOverlay, MarkerOptions, MarkerIcon, Marker, PolylineOptions, HtmlInfoWindow } from '@ionic-native/google-maps';

/**
 * Generated class for the PositioningPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */

declare var cordova: any;
declare var plugin: any;

@Component({
  selector: 'page-positioning',
  templateUrl: 'positioning.html',
})
export class PositioningPage {

  building: any;

  buildingName: string = '';

  positioning: boolean = false;

  position: any = {
    statusName: '',
    floorIdentifier: '',
    x: -1,
    y: -1,
    accuracy: -1,
    bearing: ''
  }

  floor: any;

  map: GoogleMap;
  poiCategories: any[] = [];
  marker: Marker;
  pois: any[] = [];
  groundOverlay: GroundOverlay = null;

  constructor(
    public platform: Platform,
    public navCtrl: NavController,
    public navParams: NavParams,
    public events: Events,
    public detector: ChangeDetectorRef,
    public sanitizer: DomSanitizer,
    public loadingCtrl: LoadingController,
    public googleMaps: GoogleMaps
  ) {
    this.building = this.navParams.get('building');
  }

  ionViewDidEnter() {
    this.platform.ready().then(() => {
      // cordova.plugins.Situm.fetchIndoorPOIsFromBuilding(this.building, (res: any) => {
      //   console.log(res);
      //   cordova.plugins.Situm.requestDirections([res[0], res[1]], (res) => {
      //     console.log(res);
      //   });
      // });
      // cordova.plugins.Situm.fetchOutdoorPOIsFromBuilding(this.building, (res: any) => {
      //   console.log(res);
      // });
      // cordova.plugins.Situm.fetchEventsFromBuilding(this.building, (res: any) => {
      //   console.log(res);
      // });
      cordova.plugins.Situm.fetchPoiCategories((res: any) => {
        this.poiCategories = res;
      });
    });
  }

  private startPositioning() {
    if (this.positioning == true) {
      console.log("Position listener is already enabled.");
      return;
    }
    this.platform.ready().then(() => {
      let buildings = [this.building];
      this.positioning = true;
      if (this.map) {
        let defaultOptions: MarkerOptions = {
          title: 'Current position'
        };
        this.map.addMarker(defaultOptions).then((marker: Marker) => {
          this.marker = marker;
          cordova.plugins.Situm.startPositioning(buildings, (res: any) => {
            this.position = res;
            if (this.position.coordinate) {
              let position: ILatLng = {
                lat: this.position.coordinate.latitude,
                lng: this.position.coordinate.longitude
              };
              this.marker.setPosition(position);
              this.detector.detectChanges();
            }
          }, (err: any) => {
            console.log(err);
          });
        });
      }
    });
  }

  private showRoute() {
    if (this.map && this.pois) {
      cordova.plugins.Situm.requestDirections([this.pois[0], this.pois[1]], (route: any) => {
        console.log(route);
        let polylineOptions: PolylineOptions = {
          color: "#754967",
          width: 4,
          points: []
        };
        route.points.forEach(point => {
          polylineOptions.points.push({
            lat: point.coordinate.latitude,
            lng: point.coordinate.longitude
          });
        });
        this.map.addPolyline(polylineOptions);
      }, (err: any) => {
        console.error(err);
      });
    }
  }

  private stopPositioning() {
    if (this.positioning == false) {
      console.log("Position listener is not enabled.");
      return;
    }
    this.positioning = false;
    if (this.marker) this.marker.remove();
    cordova.plugins.Situm.stopPositioning((res) => {
      console.log(res);
    }, (err) => {
      console.log(err);
    });
  }

  private showPois() {
    cordova.plugins.Situm.fetchIndoorPOIsFromBuilding(this.building, (res: any) => {
      this.pois = res;
      console.log(res);
      if (this.poiCategories && this.map) {
        res.forEach(element => {
          console.log(element);
          let category = this.poiCategories.find((poiCategory: any) => {
            return poiCategory.poiCategoryCode == element.category
          });
          element.category = category;
          let markerPosition: ILatLng = {
            lat: element.coordinate.latitude,
            lng: element.coordinate.longitude
          }
          let icon: MarkerIcon = {
            url: element.category.icon_selected,
            size: {
              height: 35,
              width: 35
            }
          }
          let markerOptions: MarkerOptions = {
            icon: icon,
            position: markerPosition
          };
          let html = element.infoHtml;
          let infoWindow = new HtmlInfoWindow();
          infoWindow.setContent(html);
          this.map.addMarker(markerOptions).then((marker: Marker) => {
            marker.on(GoogleMapsEvent.MARKER_CLICK).subscribe(() => {
              infoWindow.open(marker);
            });
          });
        });
      }
    });
  }

  private showMap() {
    if (!this.map) {
      this.platform.ready().then(() => {
        let loading = this.loadingCtrl.create({
          content: "Cargando mapa..."
        });
        loading.present();
        cordova.plugins.Situm.fetchFloorsFromBuilding(this.building, (res) => {
          this.floor = res[0];
          // let element: HTMLElement = document.getElementById('map');
          let center: LatLng = new LatLng(this.building.center.latitude, this.building.center.longitude);
          let options: GoogleMapOptions = {
            camera: {
              target: center,
              zoom: 20
            }
          };
          this.map = GoogleMaps.create('map', options);
          // loading.dismiss();
          let boundsSW: LatLng = new LatLng(this.building.bounds.southWest.latitude, this.building.bounds.southWest.longitude);
          let boundsNE: LatLng = new LatLng(this.building.bounds.northEast.latitude, this.building.bounds.northEast.longitude);
          let bounds = [
            { lat: this.building.bounds.southWest.latitude, lng: this.building.bounds.southWest.longitude },
            { lat: this.building.bounds.northEast.latitude, lng: this.building.bounds.northEast.longitude }
          ];
          let groundOptions: GroundOverlayOptions = {
            bounds: bounds,
            url: this.floor.mapUrl,
            bearing: this.building.rotation * 180 / Math.PI
          }
          this.map.on(GoogleMapsEvent.MAP_READY).subscribe(() => {
            return this.map.addGroundOverlay(groundOptions).then((data: any) => {
              this.groundOverlay = data;
              loading.dismiss();
            }).catch((err: any) => {
              console.log(err);
              loading.dismiss();
            });
            // loading.dismiss();
          });
        });
      });
    }
  }

  public clear() {
    this.groundOverlay.remove();
    this.map.remove();
  }

  ionViewDidLeave() {
    this.building = undefined;
    this.buildingName = undefined;
    this.positioning = undefined;
    this.position = undefined;
    this.floor = undefined;
    this.map = undefined;
    this.poiCategories = undefined;
    this.marker = undefined;
    this.pois = undefined;
    this.stopPositioning();
  }

}
