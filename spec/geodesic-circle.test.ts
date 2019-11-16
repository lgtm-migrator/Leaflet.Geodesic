/**
 * @jest-environment jsdom
 */
import L from "leaflet";
import { GeodesicOptions } from "../src/geodesic-core"
import { GeodesicCircleClass } from "../src/geodesic-circle";
import { expect } from "chai";

import "jest";

// test case with distance 54972.271 m
const FlindersPeak: L.LatLngLiteral = { lat: -37.9510334166667, lng: 144.424867888889 };
const Buninyong: L.LatLngLiteral = { lat: -37.6528211388889, lng: 143.926495527778 };

const Seattle: L.LatLngLiteral = { lat: 47.56, lng: -122.33 };
const Beijing: L.LatLngLiteral = { lat: 39.92, lng: 116.39 };

const defaultOptions: GeodesicOptions = { wrap: true, steps: 24, fill: true, noClip: true };

const eps = 0.000001;

function checkFixture(specimen: L.LatLngLiteral[][], fixture: L.LatLngLiteral[][]): void {
    expect(specimen).to.be.an("array");
    expect(specimen).to.be.length(fixture.length);
    specimen.forEach((line, k) => {
        expect(line).to.be.length(fixture[k].length);
        line.forEach((point, l) => {
            expect(point).to.be.an("object");
            expect(point).to.include.all.keys("lat", "lng");
            expect(point.lat).to.be.closeTo(fixture[k][l].lat, eps);
            expect(point.lng).to.be.closeTo(fixture[k][l].lng, eps);
        });
    });
}

function compareObject(specimen: object, fixture: object): void {
    for (let [key, value] of Object.entries(specimen)) {
        expect(specimen).to.have.own.property(key, value);
    }
}

describe("Main functionality", function () {
    let container: HTMLElement;
    let map: L.Map;
    const radius = 1000 * 1000;

    beforeEach(function () {
        container = document.createElement('div');
        container.style.width = '400px';
        container.style.height = '400px';
        map = L.map(container, { renderer: new L.SVG(), center: [0, 0], zoom: 12 });
    });

    it("Create class w/o any parameters", function () {
        const circle = new GeodesicCircleClass();
        expect(circle).to.be.instanceOf(GeodesicCircleClass);
        compareObject(circle.options, defaultOptions);
    });

    it("Create class with parameters", function () {
        const circle = new GeodesicCircleClass(Beijing, { steps: 48 });
        expect(circle).to.be.instanceOf(GeodesicCircleClass);
        compareObject(circle.options, defaultOptions);
    });

    it("Add empty circle to map", async function () {
        const circle = new GeodesicCircleClass().addTo(map);
        expect(circle).to.be.instanceOf(GeodesicCircleClass);
        compareObject(circle.options, defaultOptions);
        expect(map.hasLayer(circle)).to.be.true;
    });

    it("update center", async function () {
        const circle = new GeodesicCircleClass(Seattle).addTo(map);
        expect(circle).to.be.instanceOf(GeodesicCircleClass);
        compareObject(circle.options, defaultOptions);
        expect(map.hasLayer(circle)).to.be.true;

        circle.setLatLng(Beijing);
        expect(circle.center.lat).to.be.closeTo(Beijing.lat, eps);
        expect(circle.center.lng).to.be.closeTo(Beijing.lng, eps);
        expect(circle.radius).to.be.closeTo(radius, eps);
    });

    it("update radius", async function () {
        const circle = new GeodesicCircleClass(Seattle, { radius: radius }).addTo(map);
        expect(circle).to.be.instanceOf(GeodesicCircleClass);
        compareObject(circle.options, { ...defaultOptions, ...{ radius: radius } });
        expect(map.hasLayer(circle)).to.be.true;

        expect(circle.center.lat).to.be.closeTo(Seattle.lat, eps);
        expect(circle.center.lng).to.be.closeTo(Seattle.lng, eps);
        circle.setRadius(2 * radius);
        expect(circle.radius).to.be.closeTo(2 * radius, eps);
    });

    it("distance function (wrapper for vincenty inverse)", function () {
        const circle = new GeodesicCircleClass(FlindersPeak);
        const res = circle.distanceTo(Buninyong);
        expect(res).to.be.a("number");
        expect(res).to.be.closeTo(54972.271, 0.001);   // epsilon is larger, because precision of reference value is only 3 digits
    });

    it("Statistics calculation (simple)", async function () {
        const circle = new GeodesicCircleClass(Beijing, { radius: 1000, steps: 24 });
        expect(circle.statistics.totalDistance).to.be.closeTo(6265.257177, eps);
        expect(circle.statistics.distanceArray).to.be.an("array");
        expect(circle.statistics.distanceArray).to.be.length(1);
        expect(circle.statistics.points).to.be.equal(1);
        expect(circle.statistics.vertices).to.be.equal(25);
    });

});

describe("Bugs", function () {
    let container: HTMLElement;
    let map: L.Map;

    beforeEach(function () {
        container = document.createElement('div');
        container.style.width = '400px';
        container.style.height = '400px';
        map = L.map(container, { renderer: new L.SVG(), center: [0, 0], zoom: 12 });
    });

    it("Calling getBounds on a GeodesicCircle throws an error (#48)", async function () {
        const circle = new GeodesicCircleClass(Seattle, { radius: 10 });
        const group = new L.FeatureGroup([circle]).addTo(map);

        compareObject(circle.options, { ...defaultOptions, ...{ radius: 10 } });
        expect(circle.center.lat).to.be.closeTo(Seattle.lat, eps);
        expect(circle.center.lng).to.be.closeTo(Seattle.lng, eps);

        expect(map.hasLayer(group)).to.be.true;

        const bounds = group.getBounds();
        expect(bounds).to.be.instanceOf(L.LatLngBounds);
        checkFixture([[bounds.getCenter()]], [[Seattle]]);
    });
});