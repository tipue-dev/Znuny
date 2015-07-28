// --
// Core.UI.AdvancedChart.js - provides the advanced Chart functions
// Copyright (C) 2001-2015 OTRS AG, http://otrs.com/
// --
// This software comes with ABSOLUTELY NO WARRANTY. For details, see
// the enclosed file COPYING for license information (AGPL). If you
// did not receive this file, see http://www.gnu.org/licenses/agpl.txt.
// --
/*global d3, nv, Chart */

"use strict";

var Core = Core || {};
Core.UI = Core.UI || {};

/**
 * @namespace
 * @exports TargetNS as Core.UI.AdvancedChart
 * @description
 *      Chart drawing
 * @requires
 *      jquery-flot
 */
Core.UI.AdvancedChart = (function (TargetNS) {

    // add dependencies to chart libs here (e.g. nvd3 etc.)
    // nvd3 is not available for IE8, so exclude this browser for the check
    if (!($.browser.msie && $.browser.version === '8.0') && !Core.Debug.CheckDependency('Core.UI.AdvancedChart', 'nv', 'nvd3')) {
        return;
    }

    TargetNS.UpdatePreferences = function(PrefName, PrefValue) {
        var URL = Core.Config.Get('CGIHandle'),
            Data = {
                Action: 'AgentPreferences',
                Subaction: 'UpdateAJAX',
                Key: PrefName
            },
            Preferences = Core.Config.Get('Pref-' + PrefName) || {},
            AttrName;

        // Merge pref settings
        $.each(PrefValue, function(ChartType, Values) {
            $.each(Values, function (Key, Value) {
                if (typeof Preferences[ChartType] === 'undefined') {
                    Preferences[ChartType] = {};
                }
                Preferences[ChartType][Key] = Value;
            });
        });
        Data.Value = Core.JSON.Stringify(Preferences);

        // update pref
        Core.AJAX.FunctionCall(URL, Data, $.noop);
    };


    /**
     * @function
     * @return nothing
     *      Initializes an nvd3 chart with data generated by a frontend module
     * @param {RawData}    Raw JSON data
     * @param {Element}    selector of the (SVG) element to use
     */
    function DrawLineChart(RawData, Element) {
        var Title = RawData.shift(),
            Headings = RawData.shift(),
            ResultData = [],
            ValueFormat = 'd', // y axis format is by default "integer"
            Colors = [ '#EC9073', '#6BAD54', '#E2F626', '#0F22E4', '#1FE362', '#C5F566', '#8D23A8', '#78A7FC', '#DFC01B', '#43B261', '#53758D', '#C1AE45', '#6CD13D', '#E0CA0E', '#652188', '#3EBB34', '#8F53EA', '#956669', '#34A0FB', '#F50178', '#AB766A', '#BEA029', '#ABE124', '#A68477', '#F7D084', '#93F0A5', '#B54667', '#F12D25', '#1DBA13', '#21AF23', '#3B62C0', '#876CDC', '#3DE6A0', '#CCD77F', '#B91583', '#8CFFFB', '#073641', '#38E1E9', '#1A5F2D', '#ED603F', '#3BB3AA', '#FA2216', '#34E25C', '#B6716A', '#E5845B', '#497FC2', '#ABCCEE', '#222047', '#DFE514', '#FFA84F', '#388B85', '#D21AEF', '#811A26', '#206057', '#557FDB', '#F148CC', '#DAFF4E', '#FCF072', '#792DA8', '#50DC0B', '#8FDC7A', '#954958', '#74575C', '#AC5CAF', '#4FF2BF', '#E4FC17', '#6ADB42', '#4B693B', '#5D7BA1', '#BF1B1C', '#A00AC1', '#13CEE0', '#02C7C0', '#21EAD8', '#C87D39', '#AEAB86', '#DA9998', '#AAB717', '#8496E6', '#FAE782', '#120BD9', '#1A3B4C', '#3F7E68', '#6FCF6B', '#5564DE', '#6E07AD', '#0C847C', '#1BB8A2', '#101DF8', '#85DE9B', '#D0AD74', '#B803D8', '#0E3C7E', '#E8E05E', '#8E36DD', '#2ADC85', '#13E17B', '#A8AE41', '#C3AA40', '#9CFD3C', '#A5782F', '#E33C5B', '#8F33D8', '#59BF4F', '#FECFB0', '#B553D8', '#2CB590', '#01045E', '#CA78AC', '#8AA596', '#54BB79', '#3A5E0E', '#F10F55', '#D205AA', '#234D8D', '#3D2F8A', '#9B4F95', '#E96E9C', '#47E4C9', '#FFC3D4', '#11231A', '#DA529F', '#789D72', '#AB9906', '#205F33', '#444685', '#05067A', '#6E2FC9', '#165AF5', '#026619', '#96EEC6', '#4DB433', '#E9219F', '#AA5F55', '#558BCA', '#56034C', '#A896DD', '#9C7CD0', '#B8B170', '#7D6F92', '#9E8A2D', '#7D6134', '#ED069E', '#74625E', '#3DC9C5', '#C64507', '#274987', '#D74EEE', '#C53379', '#1A6E42', '#308859', '#F70419', '#BE10CF', '#E841CC', '#AD60CB', '#30BB80', '#5886C9' ],
            Color,
            Counter = 0,
            PreferencesData = Core.Config.Get('Pref-' + $(Element).attr('class'));

        if (typeof PreferencesData.Line !== 'undefined') {
            PreferencesData = PreferencesData.Line;
        }
        else {
            PreferencesData = {};
        }

        $.each(RawData, function(DataIndex, DataElement) {
            // Ignore sum row
            if (DataElement[0] === 'Sum') {
                return;
            }

            var ResultLine = {
                key: DataElement[0],
                color: Colors[Counter % Colors.length],
                disabled: (PreferencesData && PreferencesData.Filter && $.inArray(DataElement[0], PreferencesData.Filter) === -1) ? true : false,
                area: true,
                values: []
            };

            $.each(Headings, function(HeadingIndex, HeadingElement){
                var Value;
                // First element is x axis label
                if (HeadingIndex === 0){
                    return;
                }
                // Ignore sum col
                if (HeadingElement === 'Sum') {
                    return;
                }

                Value = parseFloat( DataElement[HeadingIndex] );

                if ( isNaN(Value) ) {
                    return;
                }

                // Check if value is a floating point number and not an integer
                if (Value % 1) {
                    ValueFormat = ',1f'; // Set y axis format to float
                }

                // Check if value is a floating point number and not an integer
                if (Value % 1) {
                    ValueFormat = ',1f'; // Set y axis format to float
                }

                // nv d3 does not work correcly with non numeric values
                ResultLine.values.push({
                    x: HeadingIndex,
                    y: Value
                });
            });
            ResultData.push(ResultLine);
            Counter++;
        });

        // production mode
        nv.dev = false;

        nv.addGraph(function() {

            var Chart = nv.models.lineChart();

            // don't let nv/d3 exceptions block the rest of OTRS JavaScript
            try {

                Chart.margin({
                    top: 20,
                    right: 70,
                    bottom: 50,
                    left: 70
                });

                Chart.useInteractiveGuideline(true)
                    .transitionDuration(350)
                    .showLegend(true)
                    .showYAxis(true)
                    .showXAxis(true);

                Chart.dispatch.on('stateChange', function(state) {

                    function getControlSelection(controlState) {
                        var Control = [];
                        $.each(controlState, function (Key, Value) {
                            if (typeof Value.disabled === 'undefined' || !Value.disabled) {
                                Control.push(Value.key);
                            }
                        });
                        return Control;
                    }

                    if ( typeof state.disabled !== 'undefined' ) {
                        TargetNS.UpdatePreferences($(Element).attr('class'), {'Line': { 'Filter': getControlSelection(ResultData) }});
                    }

                });

                Chart.xAxis.tickFormat(function(d) {
                    return Headings[d];
                });

                Chart.yAxis
                    .tickFormat(d3.format(ValueFormat));

                d3.select(Element)
                    .datum(ResultData)
                    .transition()
                    .duration(500)
                    .call(Chart);

                nv.utils.windowResize(Chart.update);
            }
            catch (Error) {
                Core.Debug.Log(Error);
            }

            return Chart;
        });
    }

    /**
     * @function
     * @return nothing
     *      Initializes an nvd3 chart with data generated by a frontend module
     * @param {RawData}    Raw JSON data
     * @param {Element}    selector of the (SVG) element to use
     */
    function DrawBarChart(RawData, Element) {

        var Title = RawData.shift(),
            Headings = RawData.shift(),
            ResultData = [],
            ValueFormat = 'd', // y axis format is by default "integer"
            Colors = [ '#EC9073', '#6BAD54', '#E2F626', '#0F22E4', '#1FE362', '#C5F566', '#8D23A8', '#78A7FC', '#DFC01B', '#43B261', '#53758D', '#C1AE45', '#6CD13D', '#E0CA0E', '#652188', '#3EBB34', '#8F53EA', '#956669', '#34A0FB', '#F50178', '#AB766A', '#BEA029', '#ABE124', '#A68477', '#F7D084', '#93F0A5', '#B54667', '#F12D25', '#1DBA13', '#21AF23', '#3B62C0', '#876CDC', '#3DE6A0', '#CCD77F', '#B91583', '#8CFFFB', '#073641', '#38E1E9', '#1A5F2D', '#ED603F', '#3BB3AA', '#FA2216', '#34E25C', '#B6716A', '#E5845B', '#497FC2', '#ABCCEE', '#222047', '#DFE514', '#FFA84F', '#388B85', '#D21AEF', '#811A26', '#206057', '#557FDB', '#F148CC', '#DAFF4E', '#FCF072', '#792DA8', '#50DC0B', '#8FDC7A', '#954958', '#74575C', '#AC5CAF', '#4FF2BF', '#E4FC17', '#6ADB42', '#4B693B', '#5D7BA1', '#BF1B1C', '#A00AC1', '#13CEE0', '#02C7C0', '#21EAD8', '#C87D39', '#AEAB86', '#DA9998', '#AAB717', '#8496E6', '#FAE782', '#120BD9', '#1A3B4C', '#3F7E68', '#6FCF6B', '#5564DE', '#6E07AD', '#0C847C', '#1BB8A2', '#101DF8', '#85DE9B', '#D0AD74', '#B803D8', '#0E3C7E', '#E8E05E', '#8E36DD', '#2ADC85', '#13E17B', '#A8AE41', '#C3AA40', '#9CFD3C', '#A5782F', '#E33C5B', '#8F33D8', '#59BF4F', '#FECFB0', '#B553D8', '#2CB590', '#01045E', '#CA78AC', '#8AA596', '#54BB79', '#3A5E0E', '#F10F55', '#D205AA', '#234D8D', '#3D2F8A', '#9B4F95', '#E96E9C', '#47E4C9', '#FFC3D4', '#11231A', '#DA529F', '#789D72', '#AB9906', '#205F33', '#444685', '#05067A', '#6E2FC9', '#165AF5', '#026619', '#96EEC6', '#4DB433', '#E9219F', '#AA5F55', '#558BCA', '#56034C', '#A896DD', '#9C7CD0', '#B8B170', '#7D6F92', '#9E8A2D', '#7D6134', '#ED069E', '#74625E', '#3DC9C5', '#C64507', '#274987', '#D74EEE', '#C53379', '#1A6E42', '#308859', '#F70419', '#BE10CF', '#E841CC', '#AD60CB', '#30BB80', '#5886C9' ],
            Color,
            Counter = 0,
            PreferencesData = Core.Config.Get('Pref-' + $(Element).attr('class'));

        if (typeof PreferencesData.Bar !== 'undefined') {
            PreferencesData = PreferencesData.Bar;
        }
        else {
            PreferencesData = {};
        }

        $.each(RawData, function(DataIndex, DataElement) {
            // Ignore sum row
            if (DataElement[0] === 'Sum') {
                return;
            }

            var ResultLine = {
                key: DataElement[0],
                color: Colors[Counter % Colors.length],
                disabled: (PreferencesData && PreferencesData.Filter && $.inArray(DataElement[0], PreferencesData.Filter) === -1) ? true : false,
                values: []
            };

            $.each(Headings, function(HeadingIndex, HeadingElement){
                var Value;
                // First element is x axis label
                if (HeadingIndex === 0){
                    return;
                }
                // Ignore sum col
                if (HeadingElement === 'Sum') {
                    return;
                }

                Value = parseFloat( DataElement[HeadingIndex] );

                if ( isNaN(Value) ) {
                    return;
                }

                // Check if value is a floating point number and not an integer
                if (Value % 1) {
                    ValueFormat = ',1f'; // Set y axis format to float
                }

                // nv d3 does not work correcly with non numeric values
                ResultLine.values.push({
                    x: HeadingElement + ' ',
                    y: Value
                });
            });
            ResultData.push(ResultLine);
            Counter++;
        });

        // production mode
        nv.dev = false;

        nv.addGraph(function() {

            var Chart = nv.models.OTRSmultiBarChart();

            // don't let nv/d3 exceptions block the rest of OTRS JavaScript
            try {

                Chart.margin({
                    top: 20,
                    right: 20,
                    bottom: 50,
                    left: 50
                });

                Chart.staggerLabels(true);

                Chart.tooltip(function(key, x, y, e, graph) {
                    return '<h3>' + key + '</h3>' + '<p>' +  x + ': ' + y + '</p>';
                });

                Chart.dispatch.on('stateChange', function(state) {

                    function getControlSelection(controlState) {
                        var Control = [];
                        $.each(controlState, function (Key, Value) {
                            if (typeof Value.disabled === 'undefined' || !Value.disabled) {
                                Control.push(Value.key);
                            }
                        });
                        return Control;
                    }

                    if ( typeof state.stacked !== 'undefined' ) {
                        TargetNS.UpdatePreferences($(Element).attr('class'), { 'Bar': { 'State': { 'Style': (state.stacked) ? 'stacked' : '' } } } );
                    }
                    if ( typeof state.disabled !== 'undefined' ) {
                        TargetNS.UpdatePreferences($(Element).attr('class'), { 'Bar': { 'Filter': getControlSelection(ResultData)}});
                    }

                });

                // set stacked/grouped state
                if (PreferencesData && PreferencesData.State) {
                    Chart.stacked((PreferencesData.State.Style === 'stacked') ? true : false);
                }
                Chart.yAxis.axisLabel("Values").tickFormat(d3.format(ValueFormat));

                d3.select(Element)
                    .datum(ResultData)
                    .transition()
                    .duration(500)
                    .call(Chart);

                nv.utils.windowResize(Chart.update);
            }
            catch (Error) {
                Core.Debug.Log(Error);
            }

            return Chart;
        });
    }

    function DrawStackedAreaChart(RawData, Element) {

        var Title = RawData.shift(),
            Headings = RawData.shift(),
            ResultData = [],
            ValueFormat = 'd', // y axis format is by default "integer"
            Colors = [ '#EC9073', '#6BAD54', '#E2F626', '#0F22E4', '#1FE362', '#C5F566', '#8D23A8', '#78A7FC', '#DFC01B', '#43B261', '#53758D', '#C1AE45', '#6CD13D', '#E0CA0E', '#652188', '#3EBB34', '#8F53EA', '#956669', '#34A0FB', '#F50178', '#AB766A', '#BEA029', '#ABE124', '#A68477', '#F7D084', '#93F0A5', '#B54667', '#F12D25', '#1DBA13', '#21AF23', '#3B62C0', '#876CDC', '#3DE6A0', '#CCD77F', '#B91583', '#8CFFFB', '#073641', '#38E1E9', '#1A5F2D', '#ED603F', '#3BB3AA', '#FA2216', '#34E25C', '#B6716A', '#E5845B', '#497FC2', '#ABCCEE', '#222047', '#DFE514', '#FFA84F', '#388B85', '#D21AEF', '#811A26', '#206057', '#557FDB', '#F148CC', '#DAFF4E', '#FCF072', '#792DA8', '#50DC0B', '#8FDC7A', '#954958', '#74575C', '#AC5CAF', '#4FF2BF', '#E4FC17', '#6ADB42', '#4B693B', '#5D7BA1', '#BF1B1C', '#A00AC1', '#13CEE0', '#02C7C0', '#21EAD8', '#C87D39', '#AEAB86', '#DA9998', '#AAB717', '#8496E6', '#FAE782', '#120BD9', '#1A3B4C', '#3F7E68', '#6FCF6B', '#5564DE', '#6E07AD', '#0C847C', '#1BB8A2', '#101DF8', '#85DE9B', '#D0AD74', '#B803D8', '#0E3C7E', '#E8E05E', '#8E36DD', '#2ADC85', '#13E17B', '#A8AE41', '#C3AA40', '#9CFD3C', '#A5782F', '#E33C5B', '#8F33D8', '#59BF4F', '#FECFB0', '#B553D8', '#2CB590', '#01045E', '#CA78AC', '#8AA596', '#54BB79', '#3A5E0E', '#F10F55', '#D205AA', '#234D8D', '#3D2F8A', '#9B4F95', '#E96E9C', '#47E4C9', '#FFC3D4', '#11231A', '#DA529F', '#789D72', '#AB9906', '#205F33', '#444685', '#05067A', '#6E2FC9', '#165AF5', '#026619', '#96EEC6', '#4DB433', '#E9219F', '#AA5F55', '#558BCA', '#56034C', '#A896DD', '#9C7CD0', '#B8B170', '#7D6F92', '#9E8A2D', '#7D6134', '#ED069E', '#74625E', '#3DC9C5', '#C64507', '#274987', '#D74EEE', '#C53379', '#1A6E42', '#308859', '#F70419', '#BE10CF', '#E841CC', '#AD60CB', '#30BB80', '#5886C9' ],
            Color,
            Counter = 0,
            PreferencesData = Core.Config.Get('Pref-' + $(Element).attr('class'));


        if (typeof PreferencesData.StackedArea !== 'undefined') {
            PreferencesData = PreferencesData.StackedArea;
        }
        else {
            PreferencesData = {};
        }

        $.each(RawData, function(DataIndex, DataElement) {

            // Ignore sum row
            if (DataElement[0] === 'Sum') {
                return;
            }

            var ResultLine = {
                key: DataElement[0],
                color: Colors[Counter % Colors.length],
                disabled: (PreferencesData && PreferencesData.Filter && $.inArray(DataElement[0], PreferencesData.Filter) === -1) ? true : false,
                values: []
            };

            $.each(Headings, function(HeadingIndex, HeadingElement){
                var Value;
                // First element is x axis label
                if (HeadingIndex === 0){
                    return;
                }
                // Ignore sum col
                if (HeadingElement === 'Sum') {
                    return;
                }

                Value = parseFloat( DataElement[HeadingIndex] );

                if ( isNaN(Value) ) {
                    return;
                }

                // Check if value is a floating point number and not an integer
                if (Value % 1) {
                    ValueFormat = ',1f'; // Set y axis format to float
                }

                // nv d3 does not work correcly with non numeric values
                ResultLine.values.push([
                    HeadingIndex,
                    Value
                ]);
            });
            ResultData.push(ResultLine);
            Counter++;
        });

        // production mode
        nv.dev = false;

        nv.addGraph(function() {

            var Chart = nv.models.OTRSstackedAreaChart();

            // don't let nv/d3 exceptions block the rest of OTRS JavaScript
            try {

                Chart.margin({
                    top: 20,
                    right: 30,
                    bottom: 30,
                    left: 60
                });

                Chart.dispatch.on('stateChange', function(state) {

                    function getControlSelection(controlState) {
                        var Control = [];
                        $.each(controlState, function (Key, Value) {
                            if (typeof Value.disabled === 'undefined' || !Value.disabled) {
                                Control.push(Value.key);
                            }
                        });
                        return Control;
                    }

                    if ( typeof state.style !== 'undefined' || typeof state.disabled !== 'undefined' ) {
                        TargetNS.UpdatePreferences($(Element).attr('class'), { 'StackedArea': { 'State': { 'Style': state.style }, 'Filter': getControlSelection(ResultData)}});
                    }

                });

                Chart.x(function(d) { return d[0]; })
                    .y(function(d) { return d[1]; })
                    .transitionDuration(500)
                    .showControls(true)
                    .clipEdge(true);

                Chart.tooltip(function(key, x, y, e, graph) {
                    return '<h3>' + key + '</h3>' + '<p>' +  x + ': ' + y + '</p>';
                });

                // remove the sum element
                Headings[Headings.indexOf('Sum')] = undefined;

                // set stacked/grouped state
                if (PreferencesData && PreferencesData.State && PreferencesData.State.Style) {
                    Chart.style(PreferencesData.State.Style);
                }

                // xAxis should have the data from rawdata as labels
                Chart.xAxis
                    .tickFormat(function(d) {
                        return Headings[d];
                    });
                Chart.yAxis
                    .tickFormat(d3.format(',.0f'));

                d3.select(Element)
                    .datum(ResultData)
                    .call(Chart);

                nv.utils.windowResize(Chart.update);
            }
            catch (Error) {
                Core.Debug.Log(Error);
            }

            return Chart;
        });
    }

    /**
     * @function
     * @return nothing
     *      Initializes a chart
     * @param {Type}       Type of the chart, e.g. Bar, Line, StackedArea, etc.
     * @param {RawData}    Raw JSON data
     * @param {Element}    selector of the (SVG) element to use
     */
    TargetNS.Init = function(Type, RawData, Element) {

        switch (Type) {
            case 'Bar':
                DrawBarChart(RawData, Element);
                break;
            case 'Line':
                DrawLineChart(RawData, Element);
                break;
            case 'StackedArea':
                DrawStackedAreaChart(RawData, Element);
                break;
        }
    };

    return TargetNS;
}(Core.UI.AdvancedChart || {}));
