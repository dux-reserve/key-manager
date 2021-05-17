<script>
	import { afterUpdate } from 'svelte';
	import { _ } from 'svelte-i18n';
	import dayjs from 'dayjs';
	import 'dayjs/locale/fr';
	import Line from 'svelte-chartjs/src/Line.svelte';
	import {
		bitcoinChartArrayData,
		bitcoinCurrentPrices,
		bitcoinMarketData,
		chartLogarithmic,
		chartTimeScale,
		selectedCurrency,
		timeNow,
		applicationSettings,
	} from '../../store';
	import { isObjectEmpty, formatNumberByThousands } from '../../utils/helpers';
	import Loading from './Loading.svelte';

	const fireIcon = './img/icons/ui/fire.svg';

	let animationDuration = 1337;
	let chart = {};
	let loaded = false;
	let showAllTimeHighAlert = false;
	let valueDiff = 0;
	let valuePercent = 0;

	const calculatedPercentageChange = (firstPrice, lastPrice) => {
		if ($bitcoinCurrentPrices[$selectedCurrency] && firstPrice && lastPrice) {
			valueDiff = lastPrice - firstPrice;
			valuePercent = (valueDiff / firstPrice) * 100;
		}
	};

	const handleSelectedTimeScale = selectedScale => {
		$chartTimeScale = selectedScale;
	};

	const handleAllTimeHighAlert = () => {
		if ($bitcoinMarketData && $bitcoinMarketData.ath && $bitcoinCurrentPrices[$selectedCurrency]) {
			showAllTimeHighAlert = $bitcoinCurrentPrices[$selectedCurrency] > $bitcoinMarketData.ath;
		} else {
			showAllTimeHighAlert = false;
		}
	};

	const handleLogarithmicChart = () => {
		$chartLogarithmic = !$chartLogarithmic;
	};

	const formatXAxes = tick => {
		let tickFormat = '';
		if (tick.includes('Feb')) tickFormat = tick.replace('Feb', 'Fev');
		else if (tick.includes('Apr')) tickFormat = tick.replace('Apr', 'Avr');
		else if (tick.includes('May')) tickFormat = tick.replace('May', 'Mai');
		else if (tick.includes('Jun')) tickFormat = tick.replace('Jun', 'Jun');
		else if (tick.includes('Jul')) tickFormat = tick.replace('Jul', 'Jul');
		else if (tick.includes('Aug')) tickFormat = tick.replace('Aug', 'Aoû');
		else tickFormat = tick;
		return tickFormat;
	};

	const handleUpdateChart = () => {
		if (!isObjectEmpty($bitcoinChartArrayData) && $bitcoinChartArrayData.length >= 1) {
			let dateArray = [];
			let priceArray = [];
			let dataArrayFilteredSelectedTimeline = [];

			dataArrayFilteredSelectedTimeline = $bitcoinChartArrayData.filter(data => data.timescale == $chartTimeScale)[0].data;

			if (dataArrayFilteredSelectedTimeline) {
				for (let i = 0; i < dataArrayFilteredSelectedTimeline.length; i++) {
					dateArray = [
						...dateArray,
						dataArrayFilteredSelectedTimeline[i][0] ? dayjs(dataArrayFilteredSelectedTimeline[i][0]).format('dddd[,] MMMM DD[,] YYYY [-] HH[:]mm') : null,
					];
					priceArray = [
						...priceArray,
						dataArrayFilteredSelectedTimeline[i][1]
							? dataArrayFilteredSelectedTimeline[i][1].toFixed($selectedCurrency === 'XAG' || $selectedCurrency === 'XAU' ? 4 : 2)
							: null,
					]; // There's sometimes data missing from the database
				}

				calculatedPercentageChange(priceArray[0], $bitcoinCurrentPrices[$selectedCurrency]);
			}

			handleAllTimeHighAlert();

			if (loaded && animationDuration > 0) {
				animationDuration = 0;
			}

			loaded = true;

			chart = {
				labels: [...dateArray],
				datasets: [
					{
						label: 'Price',
						fill: true,
						lineTension: 0.21,
						borderWidth: 1,
						backgroundColor: 'rgba(43, 61, 79, .92)',
						borderColor: 'rgba(33, 51, 69, .62)',
						borderCapStyle: 'butt',
						borderDash: [],
						borderDashOffset: 0.0,
						borderJoinStyle: 'miter',
						pointBorderColor: 'rgba(255, 255, 255, 0)',
						pointBackgroundColor: 'rgba(255, 255, 255, 0)',
						pointBorderWidth: 0,
						pointHoverRadius: 3,
						pointHoverBackgroundColor: 'rgb(21, 24, 28)',
						pointHoverBorderColor: 'rgba(220, 220, 220, .9)',
						pointHoverBorderWidth: 1,
						pointRadius: 1,
						pointHitRadius: 9,
						data: [...priceArray],
					},
				],
				options: {
					animation: {
						duration: animationDuration,
					},
					legend: {
						display: false,
					},
					responsive: true,
					maintainAspectRatio: false,
					hover: {
						mode: 'nearest',
						intersect: true,
					},
					tooltips: {
						mode: 'nearest',
						intersect: true,
						backgroundColor: 'rgb(21, 24, 28)',
						displayColors: false,
						// TODO: french date
						callbacks: {
							label: tooltipItem => {
								return `Price: ${formatNumberByThousands(
									tooltipItem.yLabel,
									true,
									$selectedCurrency,
									false,
									$selectedCurrency === 'XAG' || $selectedCurrency === 'XAU' ? 4 : 2,
								)}`;
							},
						},
					},
					scales: {
						xAxes: [
							{
								type: 'time',
								time: {
									parser: 'dddd, MMMM DD, YYYY - HH:mm',
									unit:
										$chartTimeScale == 1
											? 'hour'
											: $chartTimeScale == 7
											? 'day'
											: $chartTimeScale == 31
											? 'day'
											: $chartTimeScale == 186
											? 'month'
											: $chartTimeScale == 365
											? 'month'
											: 'quarter',
									displayFormats: {
										minute: 'HH:mm:ss',
										hour: 'HH:mm',
										day: 'DD MMM',
										week: 'DD MMM',
										month: "MMM 'YY",
										quarter: "MMM 'YY",
										year: 'YYYY',
									},
								},
								ticks: {
									display: true,
									autoSkip: true,
									maxTicksLimit:
										$chartTimeScale == 1
											? 12
											: $chartTimeScale == 7
											? 8
											: $chartTimeScale == 31
											? 6
											: $chartTimeScale == 186
											? 7
											: $chartTimeScale == 365
											? 12
											: 24,
									maxRotation: 0,
									labelOffset: $chartTimeScale == 365 || $chartTimeScale == 1095 ? -8 : 0,
									callback: tick => {
										return formatXAxes(tick);
									},
								},
								gridLines: { display: false, color: 'rgba(0, 0, 0, 0)' },
							},
						],
						yAxes: [
							{
								type: $chartLogarithmic ? 'logarithmic' : 'linear',
								position: 'right',
								ticks: {
									display: true,
									lineHeight: 2.5,
									callback: value => {
										return formatNumberByThousands(
											value,
											true,
											$selectedCurrency,
											false,
											($selectedCurrency === 'XAG' || $selectedCurrency === 'XAU') && value < 1 && $chartLogarithmic ? 2 : 0,
										);
									},
								},
								scaleLabel: {
									display: false,
								},
								gridLines: { display: false, color: 'rgba(0, 0, 0, 0)' },
							},
						],
					},
				},
			};
		}
	};

	afterUpdate(() => {
		handleUpdateChart();
	});
</script>

{#if !loaded}
	<div class="loading-container">
		<Loading text={$_('price_chart.loading', { default: 'Fetching chart data' })} />
	</div>
{:else}
	<div class="chart-content">
		<div class="chart-menu">
			<div class="chart-title">
				<h5 class="subtitle has-smaller-margin is-5 has-text-weight-bold">{$_('price_chart.title', { default: 'Bitcoin price' })}</h5>
				{#if showAllTimeHighAlert}
					<span class="icon ath-icon is-normal has-no-hover is-primary is-inline-block ml-1" title={$_('price_chart.ath_title', { default: 'NEW ALL TIME HIGH' })}
						><img src={fireIcon} alt="All Time High" /></span
					>
				{/if}
				<h4
					class="title is-4 has-smaller-margin skeleton-block skeleton-title skeleton-small is-vertical-center mb-2 absolute is-family-primary is-dark"
					class:skeleton={!$bitcoinCurrentPrices[$selectedCurrency]}
				>
					{formatNumberByThousands($bitcoinCurrentPrices[$selectedCurrency], true, $selectedCurrency)}
					<span class="is-size-5 ml-1">{$selectedCurrency}</span>
					<span class="subtitle is-size-6 has-text-white-ter ml-2 has-text-weight-normal" class:is-hidden={!$bitcoinCurrentPrices[$selectedCurrency]}>
						<span class:has-text-success={valueDiff > 0} class:has-text-danger={valueDiff < 0} class:is-hidden={!$bitcoinCurrentPrices[$selectedCurrency]}
							>{formatNumberByThousands(valuePercent, false, '', true)}<span class="is-size-7">%</span>
							<span class="ml-1">({formatNumberByThousands(valueDiff, true, $selectedCurrency, true, 2, false)})</span>
						</span>
					</span>
				</h4>
				<h6
					class="last-time-updated title is-8 has-smaller-margin skeleton-block skeleton-title skeleton-small is-vertical-center absolute is-family-primary has-text-grey"
					class:skeleton={!$bitcoinCurrentPrices[$selectedCurrency]}
					title="Last price update"
				>
					<span class="is-capitalized"
						>{dayjs($timeNow)
							.locale($applicationSettings.interfaceLanguage === 'fr' ? 'fr' : 'en')
							.format($applicationSettings.interfaceLanguage === 'fr' ? 'DD MMMM YYYY' : 'MMMM DD[,] YYYY')}</span
					>
					<span class="is-size-8-custom mr-1 ml-1 ml-1-custom">|</span>
					{dayjs($timeNow)
						.locale($applicationSettings.interfaceLanguage === 'fr' ? 'fr' : 'en')
						.format('HH[:]mm[:]ss')}
				</h6>
			</div>
			<div class="chart-timescale">
				<ul class="chart-timescale-items is-uppercase">
					<li class="list-item" class:is-active={$chartTimeScale == 1} on:click={() => handleSelectedTimeScale('1')}>
						1{$_('price_chart.day', { default: 'D' })}
					</li>
					<li class="list-item" class:is-active={$chartTimeScale == 7} on:click={() => handleSelectedTimeScale('7')}>
						7{$_('price_chart.day', { default: 'D' })}
					</li>
					<li class="list-item" class:is-active={$chartTimeScale == 31} on:click={() => handleSelectedTimeScale('31')}>
						1{$_('price_chart.month', { default: 'M' })}
					</li>
					<li class="list-item" class:is-active={$chartTimeScale == 186} on:click={() => handleSelectedTimeScale('186')}>
						6{$_('price_chart.month', { default: 'M' })}
					</li>
					<li class="list-item" class:is-active={$chartTimeScale == 365} on:click={() => handleSelectedTimeScale('365')}>
						1{$_('price_chart.year', { default: 'Y' })}
					</li>
					<li class="list-item" class:is-active={$chartTimeScale == 1095} on:click={() => handleSelectedTimeScale('1095')}>
						3{$_('price_chart.year', { default: 'Y' })}
					</li>
					<li class="list-item" class:is-active={$chartTimeScale == 'max'} on:click={() => handleSelectedTimeScale('max')}>
						{$_('price_chart.all', { default: 'ALL' })}
					</li>
					<li class="list-item log-bar">|</li>
					<li
						class="list-item"
						class:is-active-log={$chartLogarithmic}
						on:click={handleLogarithmicChart}
						title={$chartLogarithmic
							? $_('price_chart.show_linear', { default: 'Show linear chart' })
							: $_('price_chart.show_log', { default: 'Show logarithmic chart' })}
					>
						{$_('price_chart.log', { default: 'LOG' })}
					</li>
				</ul>
			</div>
		</div>

		<div class="chart-line">
			<Line data={chart} options={chart.options} />
		</div>
	</div>
{/if}

<style lang="scss">
	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-top: auto;
		margin-bottom: auto;
	}

	.chart-content {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		margin: 2rem;
	}

	.chart-menu {
		display: flex;
		justify-content: space-between;
		margin-bottom: 2.625rem;

		.chart-title .absolute {
			position: absolute;
		}
	}

	.chart-timescale {
		display: flex;
		justify-content: flex-end;
		margin-right: 4.625rem;

		.chart-timescale-items {
			display: flex;
			justify-content: space-between;
			width: 314px;

			.log-bar {
				margin-right: 0.2rem;
				margin-left: 0.1rem;
				font-size: 0.9em;
				font-weight: 300 !important;
			}

			.list-item:not(.log-bar) {
				text-transform: uppercase;

				&.is-active {
					font-weight: 700;
				}

				&.is-active-log {
					font-weight: 500;
				}

				&:not(.is-active):hover {
					font-weight: 500;
				}

				&:hover {
					cursor: pointer;
				}
			}
		}
	}

	.chart-line {
		width: 100%;
		height: calc(100% - 2.021rem);
	}

	.ath-icon {
		position: absolute;
		top: 0;
		left: 121.5px;
	}

	.last-time-updated {
		top: 65px;
	}

	.is-size-8-custom {
		font-size: 0.75rem;
	}

	.ml-1-custom {
		margin-bottom: 0.1rem;
	}
</style>
